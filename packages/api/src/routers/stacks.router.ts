import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  StackCreateInputSchema,
  StackListOutputSchema,
  StackOutputSchema,
  StackUpdateInputSchema,
  sanitizeSvg
} from "@tsu-stack/core";
import { stackDependencyRepository, stackRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { toStackOutput } from "#@/routers/portfolio.mappers";

const NPM_SEARCH_SIZE = 10;
const NPM_REGISTRY_SEARCH_URL = "https://registry.npmjs.org/-/v1/search";

const NpmSearchItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  keywords: z.array(z.string()),
  links: z.object({
    repository: z.string().nullable(),
    homepage: z.string().nullable(),
    npm: z.string()
  }),
  downloads: z.object({
    monthly: z.number(),
    weekly: z.number()
  })
});

const NpmSearchOutputSchema = z.object({
  total: z.number(),
  items: z.array(NpmSearchItemSchema)
});

export const stacksRouter = {
  list: protectedProcedure
    .route({
      description: "List all tech stacks",
      method: "GET"
    })
    .output(StackListOutputSchema)
    .handler(async () => {
      const stacks = await stackRepository.findAllWithDependencies();
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
      if (!stack) return null;
      const deps = await stackDependencyRepository.findByStackId(input.id);
      return toStackOutput({
        ...stack,
        name: stack.name,
        icon: stack.icon,
        description: stack.description,
        type: stack.type,
        healthStatus: stack.healthStatus,
        confidence: stack.confidence,
        sortOrder: stack.sortOrder,
        portfolioEntryId: stack.portfolioEntryId,
        dependencies: deps.map((d) => {
          return {
            npmPackage: d.npmPackage,
            description: d.description,
            homepage: d.homepage
          };
        }),
        projects: (stack.projects ?? [])
          .filter(
            (
              ps
            ): ps is { project: { id: string; title: string; logo: string | null } } & Omit<
              typeof ps,
              "project"
            > => ps.project !== null
          )
          .map((ps) => {
            return {
              id: ps.project.id,
              name: ps.project.title,
              logo: ps.project.logo
            };
          })
      });
    }),
  create: protectedProcedure
    .route({
      description: "Create a new tech stack",
      method: "POST"
    })
    .input(StackCreateInputSchema)
    .output(StackOutputSchema)
    .handler(async ({ input }) => {
      const { includedInPortfolio, name, description, icon, dependencies, projectIds } = input;
      const existing = await stackRepository.findByName(name);
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "A stack with this name already exists."
        });
      }
      const all = await stackRepository.findAll();
      const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
      const created = await stackRepository.create(
        { name, description: description ?? null, icon: icon ?? null, sortOrder: nextSortOrder },
        { includedInPortfolio, dependencies: dependencies ?? [], projectIds }
      );
      return toStackOutput({
        ...created!,
        projects: (created!.projects ?? [])
          .filter(
            (
              ps
            ): ps is { project: { id: string; title: string; logo: string | null } } & Omit<
              typeof ps,
              "project"
            > => ps.project !== null
          )
          .map((ps) => {
            return {
              id: ps.project.id,
              name: ps.project.title,
              logo: ps.project.logo
            };
          })
      });
    }),
  update: protectedProcedure
    .route({
      description: "Update a tech stack",
      method: "PATCH"
    })
    .input(z.object({ id: z.string(), data: StackUpdateInputSchema }))
    .output(StackOutputSchema.nullable())
    .handler(async ({ input }) => {
      const { includedInPortfolio, dependencies, projectIds, ...updateData } = input.data;
      if (updateData.name) {
        const existing = await stackRepository.findByName(updateData.name);
        if (existing && existing.id !== input.id) {
          throw new ORPCError("CONFLICT", {
            message: "A stack with this name already exists."
          });
        }
      }
      const updated = await stackRepository.update(input.id, updateData, {
        includedInPortfolio,
        dependencies,
        projectIds
      });
      return updated ? toStackOutput(updated) : null;
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
  merge: protectedProcedure
    .route({
      description: "Merge a victim stack into a survivor stack",
      method: "POST"
    })
    .input(z.object({ survivorId: z.string(), victimId: z.string() }))
    .output(z.object({ merged: z.object({ id: z.string(), name: z.string() }) }))
    .handler(async ({ input }) => {
      try {
        return await stackRepository.merge(input.survivorId, input.victimId);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to merge stacks");
      }
    }),
  batchMerge: protectedProcedure
    .route({
      description: "Batch merge multiple stacks",
      method: "POST"
    })
    .input(z.object({ items: z.array(z.object({ survivorId: z.string(), victimId: z.string() })) }))
    .output(z.array(z.object({ merged: z.object({ id: z.string(), name: z.string() }) })))
    .handler(async ({ input }) => {
      try {
        return await stackRepository.batchMerge(input.items);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to batch merge stacks");
      }
    }),
  batchUpdate: protectedProcedure
    .route({
      description: "Batch update multiple stacks",
      method: "POST"
    })
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            data: StackUpdateInputSchema
          })
        )
      })
    )
    .output(z.array(z.object({ id: z.string(), name: z.string() })))
    .handler(async ({ input }) =>
      stackRepository.batchUpdate(
        input.items.map((item) => {
          return {
            id: item.id,
            data: item.data
          };
        })
      )
    ),
  searchNpm: publicProcedure
    .route({
      description: "Search npm packages by name",
      method: "GET"
    })
    .errors({
      NPM_API_ERROR: {
        description: "Failed to fetch results from npm registry",
        status: 502
      }
    })
    .input(z.object({ query: z.string().min(1).max(50) }))
    .output(NpmSearchOutputSchema)
    .handler(async ({ input, errors }) => {
      const url = new URL(NPM_REGISTRY_SEARCH_URL);
      url.searchParams.set("text", input.query);
      url.searchParams.set("size", String(NPM_SEARCH_SIZE));

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Accept: "application/json" }
        });
      } catch {
        throw errors.NPM_API_ERROR({ message: "Network error reaching npm registry" });
      }

      if (!res.ok) {
        throw errors.NPM_API_ERROR({ message: `npm registry returned ${res.status}` });
      }

      const data = (await res.json()) as {
        total: number;
        objects: Array<{
          package: Record<string, unknown>;
          score?: { detail?: { popularity?: number } };
        }>;
      };

      const items = data.objects.map((obj) => {
        const pkg = obj.package;
        const links = (pkg.links ?? {}) as Record<string, string | undefined>;
        return {
          name: (pkg.name as string) ?? "",
          description: (pkg.description as string) ?? "",
          version: (pkg.version as string) ?? "",
          keywords: Array.isArray(pkg.keywords) ? (pkg.keywords as string[]) : [],
          links: {
            repository: links.repository ?? null,
            homepage: links.homepage ?? null,
            npm: links.npm ?? ""
          },
          downloads: { monthly: 0, weekly: 0 }
        };
      });

      return { total: data.total, items };
    }),
  listDependencies: protectedProcedure
    .route({
      description: "List npm dependencies for a stack",
      method: "GET"
    })
    .input(z.object({ stackId: z.string() }))
    .handler(async ({ input }) => stackDependencyRepository.findByStackId(input.stackId)),
  addDependency: protectedProcedure
    .route({
      description: "Add an npm dependency to a stack",
      method: "POST"
    })
    .input(
      z.object({
        stackId: z.string(),
        npmPackage: z.string().min(1),
        description: z.string().nullable().optional(),
        version: z.string().nullable().optional(),
        homepage: z.string().nullable().optional()
      })
    )
    .handler(async ({ input }) => {
      const { stackId, ...data } = input;
      const existing = await stackRepository.findById(stackId);
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Stack not found" });
      }
      return stackDependencyRepository.reassign(
        stackId,
        data.npmPackage,
        data.description,
        data.homepage
      );
    }),
  removeDependency: protectedProcedure
    .route({
      description: "Remove an npm dependency from a stack",
      method: "DELETE"
    })
    .input(z.object({ stackId: z.string(), npmPackage: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input }) => {
      await stackDependencyRepository.deleteByNpmPackage(input.stackId, input.npmPackage);
      return { success: true };
    }),
  upsertFromDetection: protectedProcedure
    .route({
      description: "Upsert stacks from detection results",
      method: "POST"
    })
    .input(
      z.object({
        stacks: z.array(
          z.object({
            npmPackage: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().nullable().optional(),
            confidence: z.string().nullable().optional(),
            iconSvg: z.string().nullable().optional(),
            relatedPackages: z.array(z.string()).optional()
          })
        )
      })
    )
    .output(z.array(z.object({ id: z.string(), name: z.string() })))
    .handler(async ({ input }) => {
      const results: Array<{ id: string; name: string }> = [];

      const seenNames = new Set<string>();
      for (const s of input.stacks) {
        if (seenNames.has(s.name)) continue;
        seenNames.add(s.name);

        let stack =
          (await stackRepository.findByNpmPackageAlias(s.npmPackage)) ??
          (await stackRepository.findByName(s.name));

        if (!stack) {
          const all = await stackRepository.findAll();
          const nextSortOrder = all.length > 0 ? Math.max(...all.map((st) => st.sortOrder)) + 1 : 0;
          stack = await stackRepository.create(
            {
              name: s.name,
              description: s.description ?? null,
              icon: s.iconSvg ? sanitizeSvg(s.iconSvg) : null,
              type: s.type,
              confidence: s.confidence ?? null,
              sortOrder: nextSortOrder
            },
            { includedInPortfolio: false }
          );
        }

        if (stack) {
          // Link the primary package + all related packages as stack dependencies.
          // If a package already belongs to a different stack, reassign it here.
          const allPackages = Array.from(new Set([s.npmPackage, ...(s.relatedPackages ?? [])]));
          for (const pkg of allPackages) {
            await stackDependencyRepository.reassign(stack.id, pkg, s.description ?? null, null);
          }
          results.push({ id: stack.id, name: stack.name });
        }
      }

      return results;
    })
};
