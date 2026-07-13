import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  StackCreateInputSchema,
  StackListOutputSchema,
  StackOutputSchema,
  StackUpdateInputSchema
} from "@tsu-stack/core";
import {
  projectRepository,
  projectStackScanRepository,
  stackDependencyRepository,
  stackRepository
} from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { toStackOutput } from "#@/routers/portfolio.mappers";

export const stacksRouter = {
  list: protectedProcedure
    .route({
      description: "List all tech stacks",
      method: "GET"
    })
    .output(StackListOutputSchema)
    .handler(async () => {
      const stacks = await stackRepository.findAll();
      return stacks.map(toStackOutput);
    }),
  get: publicProcedure
    .route({
      description: "Get a single stack by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(StackOutputSchema.nullable())
    .handler(async ({ input }) => {
      const stack = await stackRepository.findById(input.id);
      return stack ? toStackOutput(stack) : null;
    }),
  create: protectedProcedure
    .route({
      description: "Create a new tech stack",
      method: "POST"
    })
    .input(StackCreateInputSchema)
    .output(StackOutputSchema)
    .handler(async ({ input }) => {
      const {
        includedInPortfolio,
        name,
        description,
        icon,
        npmPackage,
        type,
        suggestedIcon,
        iconSvg
      } = input;
      const existing = await stackRepository.findByName(name);
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "A stack with this name already exists."
        });
      }
      const all = await stackRepository.findAll();
      const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
      const created = await stackRepository.create(
        {
          name,
          description: description ?? null,
          icon: icon ?? null,
          npmPackage,
          type,
          suggestedIcon,
          iconSvg,
          sortOrder: nextSortOrder
        },
        { includedInPortfolio }
      );
      return toStackOutput(created!);
    }),
  update: protectedProcedure
    .route({
      description: "Update a tech stack",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: StackUpdateInputSchema }))
    .output(StackOutputSchema.nullable())
    .handler(async ({ input }) => {
      const { includedInPortfolio, ...updateData } = input.data;
      if (updateData.name) {
        const existing = await stackRepository.findByName(updateData.name);
        if (existing && existing.id !== input.id) {
          throw new ORPCError("CONFLICT", {
            message: "A stack with this name already exists."
          });
        }
      }
      const updated = await stackRepository.update(input.id, updateData, { includedInPortfolio });
      return updated ? toStackOutput(updated) : null;
    }),
  batchUpdate: protectedProcedure
    .route({
      description: "Batch update multiple tech stacks in a single transaction",
      method: "POST"
    })
    .input(
      z.object({
        items: z.array(z.object({ id: z.string(), data: StackUpdateInputSchema }))
      })
    )
    .output(z.array(z.object({ id: z.string(), name: z.string() })))
    .handler(async ({ input }) => {
      // Deduplicate by id (last one wins)
      const itemMap = new Map<string, (typeof input.items)[number]>();
      for (const item of input.items) {
        itemMap.set(item.id, item);
      }
      const items = Array.from(itemMap.values()).map(({ id, data }) => {
        const { includedInPortfolio, ...updateData } = data;
        return { id, data: updateData, options: { includedInPortfolio } };
      });

      // Check for intra-batch duplicate names
      const nameMap = new Map<string, string>();
      for (const { id, data } of items) {
        if (data.name) {
          const existingId = nameMap.get(data.name);
          if (existingId && existingId !== id) {
            throw new ORPCError("CONFLICT", {
              message: `Multiple items in batch target the same name "${data.name}".`
            });
          }
          nameMap.set(data.name, id);
        }
      }

      // Validate names don't conflict with existing DB rows
      for (const { id, data } of items) {
        if (data.name) {
          const existing = await stackRepository.findByName(data.name);
          if (existing && existing.id !== id) {
            throw new ORPCError("CONFLICT", {
              message: `A stack with name "${data.name}" already exists.`
            });
          }
        }
      }

      return await stackRepository.batchUpdate(items);
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder stacks by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input }) => {
      await stackRepository.reorder(input.items);
      return { success: true };
    }),
  merge: protectedProcedure
    .route({
      description: "Merge two stacks — moves projects and aliases from victim to survivor",
      method: "POST"
    })
    .input(z.object({ survivorId: z.string(), victimId: z.string() }))
    .output(
      z.object({
        merged: z.object({ id: z.string(), name: z.string() }),
        aliases: z.array(z.object({ id: z.string(), npmPackage: z.string() }))
      })
    )
    .handler(async ({ input }) => {
      try {
        return await stackRepository.merge(input.survivorId, input.victimId);
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message: error instanceof Error ? error.message : "Failed to merge stacks"
        });
      }
    }),
  batchMerge: protectedProcedure
    .route({
      description: "Batch merge multiple stacks in a single transaction",
      method: "POST"
    })
    .input(
      z.object({
        items: z.array(z.object({ survivorId: z.string(), victimId: z.string() }))
      })
    )
    .output(
      z.array(
        z.object({
          merged: z.object({ id: z.string(), name: z.string() }),
          aliases: z.array(z.object({ id: z.string(), npmPackage: z.string() }))
        })
      )
    )
    .handler(async ({ input }) => {
      try {
        return await stackRepository.batchMerge(input.items);
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message: error instanceof Error ? error.message : "Failed to batch merge stacks"
        });
      }
    }),
  delete: protectedProcedure
    .route({
      description: "Delete a tech stack and unlink it from all projects",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input }) => {
      const deleted = await stackRepository.delete(input.id);
      return { success: deleted !== null };
    }),
  usageCount: protectedProcedure
    .route({
      description: "Get the number of projects using a stack",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ count: z.number().int() }))
    .handler(async ({ input }) => {
      const count = await stackRepository.getUsageCount(input.id);
      return { count };
    }),
  bulkCreate: protectedProcedure
    .route({
      description: "Create multiple tech stacks at once",
      method: "POST"
    })
    .input(z.object({ stacks: z.array(StackCreateInputSchema) }))
    .output(StackListOutputSchema)
    .handler(async ({ input }) => {
      // Check for duplicates by npm package and name
      const npmPackages = input.stacks.map((s) => s.npmPackage);
      const names = input.stacks.map((s) => s.name);

      const existingStacks = await stackRepository.findAll();
      const conflicts = existingStacks.filter(
        (s) => npmPackages.includes(s.npmPackage) || names.includes(s.name)
      );

      if (conflicts.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: `Stacks with these names already exist: ${conflicts.map((s) => s.name).join(", ")}`
        });
      }

      // Create all stacks in a transaction
      const createdStacks = [];
      for (const stackInput of input.stacks) {
        const {
          includedInPortfolio,
          name,
          description,
          icon,
          npmPackage,
          type,
          suggestedIcon,
          iconSvg
        } = stackInput;
        const allStacks = await stackRepository.findAll();
        const nextSortOrder =
          allStacks.length > 0 ? Math.max(...allStacks.map((s) => s.sortOrder)) + 1 : 0;

        const created = await stackRepository.create(
          {
            name,
            description: description ?? null,
            icon: icon ?? null,
            npmPackage,
            type,
            suggestedIcon,
            iconSvg,
            sortOrder: nextSortOrder
          },
          { includedInPortfolio }
        );

        if (created) {
          createdStacks.push(created);
        }
      }

      return createdStacks.map(toStackOutput);
    }),
  upsertFromDetection: protectedProcedure
    .route({
      description: "Upsert detected stacks — creates new ones, returns IDs for existing",
      method: "POST"
    })
    .input(
      z.object({
        stacks: z.array(
          z.object({
            npmPackage: z.string(),
            name: z.string(),
            type: z.string().optional(),
            description: z.string().nullable().optional(),
            suggestedIcon: z.string().nullable().optional(),
            iconSvg: z.string().nullable().optional(),
            confidence: z.string().nullable().optional()
          })
        )
      })
    )
    .output(z.array(z.object({ id: z.string(), npmPackage: z.string() })))
    .handler(async ({ input }) => {
      if (input.stacks.length === 0) return [];

      const results: Array<{ id: string; npmPackage: string }> = [];

      for (const detected of input.stacks) {
        // Check if stack already exists by npmPackage or name
        const existing =
          (await stackRepository.findByNpmPackage(detected.npmPackage)) ??
          (await stackRepository.findByName(detected.name));
        if (existing) {
          results.push({ id: existing.id, npmPackage: detected.npmPackage });
          continue;
        }

        // Create new stack
        const allStacks = await stackRepository.findAll();
        const nextSortOrder =
          allStacks.length > 0 ? Math.max(...allStacks.map((s) => s.sortOrder)) + 1 : 0;

        const created = await stackRepository.create({
          name: detected.name,
          npmPackage: detected.npmPackage,
          type: detected.type ?? "other",
          description: detected.description ?? null,
          suggestedIcon: detected.suggestedIcon ?? null,
          iconSvg: detected.iconSvg ?? null,
          confidence: detected.confidence ?? "low",
          sortOrder: nextSortOrder
        });

        if (created) {
          results.push({ id: created.id, npmPackage: detected.npmPackage });
        }
      }

      return results;
    }),
  createAliases: protectedProcedure
    .route({
      description: "Create stack aliases in bulk",
      method: "POST"
    })
    .input(
      z.object({
        aliases: z.array(
          z.object({
            stackId: z.string(),
            npmPackage: z.string()
          })
        )
      })
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      if (input.aliases.length === 0) return { success: true };

      // Verify all stack IDs exist
      const stackIds = [...new Set(input.aliases.map((a) => a.stackId))];
      const existingStacks = await stackRepository.findManyById(stackIds);
      const missingIds = stackIds.filter((id) => !existingStacks.some((s) => s.id === id));

      if (missingIds.length > 0) {
        throw new ORPCError("NOT_FOUND", {
          message: `Stacks not found: ${missingIds.join(", ")}`
        });
      }

      // Check for existing aliases
      const packages = input.aliases.map((a) => a.npmPackage);
      const existingAliases = await stackDependencyRepository.findManyByNpmPackages(packages);
      const conflictingPackages = existingAliases.map((a) => a.npmPackage);

      if (conflictingPackages.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: `Aliases already exist for packages: ${conflictingPackages.join(", ")}`
        });
      }

      await stackDependencyRepository.createMany(
        input.aliases.map((a) => {
          return { stackId: a.stackId, npmPackage: a.npmPackage };
        })
      );

      return { success: true };
    }),
  createScan: protectedProcedure
    .route({
      description: "Record a stack scan for a project",
      method: "POST"
    })
    .input(
      z.object({
        projectId: z.string(),
        runId: z.string(),
        detectedPackages: z.array(z.string()),
        detectedStackIds: z.array(z.string())
      })
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      // Verify project exists
      const project = await projectRepository.findById(input.projectId);
      if (!project) {
        throw new ORPCError("NOT_FOUND", {
          message: "Project not found"
        });
      }

      await projectStackScanRepository.create({
        projectId: input.projectId,
        runId: input.runId,
        detectedPackages: input.detectedPackages,
        detectedStackIds: input.detectedStackIds
      });

      return { success: true };
    })
};
