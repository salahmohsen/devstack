import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  DeleteResponseSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  STACKS_LIST_PAGE_SIZE,
  StackCreateInputSchema,
  StackListOutputSchema,
  StackListPageInputSchema,
  StackListPageOutputSchema,
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
  /**
   * Full catalog for pickers (stack-selector, project form) and organize normalize.
   * Dashboard grid uses `listPage` + infinite scroll instead.
   */
  list: protectedProcedure
    .route({
      description:
        "List all tech stacks (full catalog for pickers; grid uses listPage). Counts only — use get for deps/projects detail",
      method: "GET"
    })
    .output(StackListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      // Avoid N+1 deps/projects on list — grid only needs identity + projectCount + icon.
      // Detail panel / forms call stacks.get (or openItem hydrates after prefetch).
      const stacks = await stackRepository.findAllByUserId(userId);
      return stacks.map((s) =>
        toStackOutput({
          ...s,
          dependencies: [],
          projects: []
        })
      );
    }),

  /** Cursor page for dashboard infinite scroll. */
  listPage: protectedProcedure
    .route({
      description:
        "Paginated tech stacks for dashboard infinite scroll (counts only — use get for detail)",
      method: "GET"
    })
    .input(StackListPageInputSchema.optional())
    .output(StackListPageOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const limit = input?.limit ?? STACKS_LIST_PAGE_SIZE;
      const page = await stackRepository.findPageByUserId(userId, {
        cursor: input?.cursor ?? null,
        limit
      });

      return {
        items: page.items.map((s) =>
          toStackOutput({
            ...s,
            dependencies: [],
            projects: []
          })
        ),
        nextCursor: page.nextCursor,
        totalCount: page.totalCount
      };
    }),

  get: protectedProcedure
    .route({
      description: "Get a single stack by ID",
      method: "GET"
    })
    .input(z.object({ id: z.string() }))
    .output(StackOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const stack = await stackRepository.findByIdForUser(input.id, userId);
      if (!stack) return null;
      const [deps, projects] = await Promise.all([
        stackDependencyRepository.findByStackId(input.id),
        stackRepository.findLinkedProjectsForUser(input.id, userId)
      ]);
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
        projectCount: projects.length,
        dependencies: deps.map((d) => {
          return {
            npmPackage: d.npmPackage,
            description: d.description,
            homepage: d.homepage
          };
        }),
        projects
      });
    }),
  create: protectedProcedure
    .route({
      description: "Create a new tech stack",
      method: "POST"
    })
    .input(StackCreateInputSchema)
    .output(StackOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, isFeatured, name, description, icon, dependencies, projectIds } =
        input;
      const existing = await stackRepository.findByNameForUser(userId, name);
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "A stack with this name already exists."
        });
      }
      const all = await stackRepository.findAllByUserId(userId);
      const nextSortOrder = all.length > 0 ? Math.max(...all.map((s) => s.sortOrder)) + 1 : 0;
      const created = await stackRepository.create(
        {
          userId,
          name,
          description: description ?? null,
          icon: icon ?? null,
          sortOrder: nextSortOrder,
          isFeatured: isFeatured ?? false
        },
        {
          includedInPortfolio: includedInPortfolio ? true : Boolean(isFeatured),
          dependencies: dependencies ?? [],
          projectIds
        }
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { includedInPortfolio, isFeatured, dependencies, projectIds, ...updateData } =
        input.data;
      if (updateData.name) {
        const existing = await stackRepository.findByNameForUser(userId, updateData.name);
        if (existing && existing.id !== input.id) {
          throw new ORPCError("CONFLICT", {
            message: "A stack with this name already exists."
          });
        }
      }
      const updated = await stackRepository.update(
        input.id,
        userId,
        { ...updateData, ...(isFeatured === undefined ? {} : { isFeatured }) },
        {
          includedInPortfolio:
            includedInPortfolio === undefined && isFeatured === true ? true : includedInPortfolio,
          dependencies,
          projectIds
        }
      );
      return updated ? toStackOutput(updated) : null;
    }),
  reorder: protectedProcedure
    .route({
      description: "Reorder stacks by updating sort orders",
      method: "POST"
    })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      await stackRepository.reorder(userId, input.items);
      return { success: true };
    }),
  delete: protectedProcedure
    .route({
      description: "Delete a tech stack and unlink it from all projects",
      method: "DELETE"
    })
    .input(z.object({ id: z.string() }))
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await stackRepository.delete(input.id, userId);
      return { success: deleted !== null };
    }),
  merge: protectedProcedure
    .route({
      description: "Merge a victim stack into a survivor stack",
      method: "POST"
    })
    .input(z.object({ survivorId: z.string(), victimId: z.string() }))
    .output(z.object({ merged: z.object({ id: z.string(), name: z.string() }) }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      try {
        return await stackRepository.merge(userId, input.survivorId, input.victimId);
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      try {
        return await stackRepository.batchMerge(userId, input.items);
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      // Pre-check name uniqueness (same as single update) to avoid 500s on unique index
      const claimedNames = new Map<string, string>(); // lower(name) → stack id
      for (const item of input.items) {
        const name = item.data.name?.trim();
        if (!name) continue;

        const key = name.toLowerCase();
        const prior = claimedNames.get(key);
        if (prior && prior !== item.id) {
          throw new ORPCError("CONFLICT", {
            message: `Duplicate name in batch: "${name}".`
          });
        }
        claimedNames.set(key, item.id);

        const existing = await stackRepository.findByNameForUser(userId, name);
        if (existing && existing.id !== item.id) {
          throw new ORPCError("CONFLICT", {
            message: `A stack with the name "${name}" already exists.`
          });
        }
      }

      return stackRepository.batchUpdate(
        userId,
        input.items.map((item) => {
          const { includedInPortfolio, isFeatured, ...updateData } = item.data;
          return {
            id: item.id,
            data: {
              ...updateData,
              ...(isFeatured === undefined ? {} : { isFeatured })
            },
            options: {
              includedInPortfolio:
                includedInPortfolio === undefined && isFeatured === true
                  ? true
                  : includedInPortfolio
            }
          };
        })
      );
    }),
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await stackRepository.findByIdForUser(input.stackId, userId);
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Stack not found" });
      }
      return stackDependencyRepository.findByStackId(input.stackId);
    }),
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { stackId, ...data } = input;
      const existing = await stackRepository.findByIdForUser(stackId, userId);
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
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await stackRepository.findByIdForUser(input.stackId, userId);
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Stack not found" });
      }
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
            npmPackage: z.string().min(1),
            name: z.string().min(1),
            type: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            confidence: z.string().nullable().optional(),
            iconSvg: z.string().nullable().optional(),
            relatedPackages: z.array(z.string()).optional(),
            /** Prefer linking an already-known stack over re-creating by name. */
            existingStackId: z.string().nullable().optional(),
            /** npm registry health from detect-stacks enrich-npm step */
            health: z
              .object({
                deprecated: z.boolean().optional(),
                downloads: z.number().optional(),
                lastPublished: z.string().optional()
              })
              .nullable()
              .optional()
          })
        )
      })
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          icon: z.string().nullable(),
          type: z.string().nullable(),
          description: z.string().nullable()
        })
      )
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const results: Array<{
        id: string;
        name: string;
        icon: string | null;
        type: string | null;
        description: string | null;
      }> = [];

      const seenKeys = new Set<string>();
      for (const s of input.stacks) {
        const dedupeKey = s.existingStackId ?? (s.npmPackage || s.name);
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        let stack =
          (s.existingStackId
            ? await stackRepository.findByIdForUser(s.existingStackId, userId)
            : null) ??
          (await stackRepository.findByNpmPackageAliasForUser(userId, s.npmPackage)) ??
          (await stackRepository.findByNameForUser(userId, s.name));

        if (!stack) {
          const all = await stackRepository.findAllByUserId(userId);
          const nextSortOrder = all.length > 0 ? Math.max(...all.map((st) => st.sortOrder)) + 1 : 0;
          try {
            stack = await stackRepository.create(
              {
                userId,
                name: s.name,
                description: s.description ?? null,
                icon: s.iconSvg ? sanitizeSvg(s.iconSvg) : null,
                type: s.type ?? null,
                healthStatus: s.health ?? null,
                confidence: s.confidence ?? null,
                sortOrder: nextSortOrder
              },
              { includedInPortfolio: false }
            );
          } catch {
            // Race / unique name: re-fetch by name or npm alias.
            stack =
              (await stackRepository.findByNpmPackageAliasForUser(userId, s.npmPackage)) ??
              (await stackRepository.findByNameForUser(userId, s.name));
          }
        } else {
          // Fill missing metadata on existing stacks without overwriting user edits.
          const patch: {
            description?: string | null;
            icon?: string | null;
            type?: string | null;
            healthStatus?: typeof s.health;
            confidence?: string | null;
          } = {};
          if (!stack.description && s.description) patch.description = s.description;
          if (!stack.icon && s.iconSvg) patch.icon = sanitizeSvg(s.iconSvg);
          if ((!stack.type || stack.type === "other") && s.type && s.type !== "other") {
            patch.type = s.type;
          }
          if (!stack.healthStatus && s.health) patch.healthStatus = s.health;
          if (!stack.confidence && s.confidence) patch.confidence = s.confidence;
          if (Object.keys(patch).length > 0) {
            stack = (await stackRepository.update(stack.id, userId, patch)) ?? stack;
          }
        }

        if (stack) {
          // Link the primary package + all related packages as stack dependencies.
          // If a package already belongs to a different stack, reassign it here.
          const allPackages = Array.from(new Set([s.npmPackage, ...(s.relatedPackages ?? [])]));
          for (const pkg of allPackages) {
            await stackDependencyRepository.reassign(stack.id, pkg, s.description ?? null, null);
          }
          results.push({
            id: stack.id,
            name: stack.name,
            icon: stack.icon ?? null,
            type: stack.type ?? null,
            description: stack.description ?? null
          });
        }
      }

      return results;
    })
};
