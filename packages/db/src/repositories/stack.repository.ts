import {
  and,
  eq,
  inArray,
  isNotNull,
  ne,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { portfolioEntry } from "../schema/portfolio-entry.schema.ts";
import { project, projectStack } from "../schema/project.schema.ts";
import { stackDependency } from "../schema/stack-dependency.schema.ts";
import { stack } from "../schema/stack.schema.ts";
import { stackDependencyRepository } from "./stack-dependency.repository.ts";

export type StackEntity = InferSelectModel<typeof stack>;
export type CreateStackData = Omit<
  InferInsertModel<typeof stack>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateStackData = Partial<CreateStackData>;
export type ReorderStackItem = { id: string; sortOrder: number };

export const stackRepository = {
  async findAll() {
    const counts = getDb()
      .select({
        stackId: projectStack.stackId,
        count: sql<number>`count(*)::int`.as("count")
      })
      .from(projectStack)
      .groupBy(projectStack.stackId)
      .as("project_counts");

    return getDb()
      .select({
        id: stack.id,
        name: stack.name,
        description: stack.description,
        icon: stack.icon,
        type: stack.type,
        healthStatus: stack.healthStatus,
        confidence: stack.confidence,
        sortOrder: stack.sortOrder,
        portfolioEntryId: stack.portfolioEntryId,
        updatedAt: stack.updatedAt,
        createdAt: stack.createdAt,
        projectCount: sql<number>`coalesce(${counts.count}, 0)`.as("project_count")
      })
      .from(stack)
      .leftJoin(counts, eq(stack.id, counts.stackId))
      .orderBy(stack.sortOrder, stack.name);
  },

  async findAllWithDependencies() {
    const stacks = await this.findAll();
    const allDeps = await stackDependencyRepository.findAll();

    const depsByStack = new Map<string, typeof allDeps>();
    for (const dep of allDeps) {
      const list = depsByStack.get(dep.stackId) ?? [];
      list.push(dep);
      depsByStack.set(dep.stackId, list);
    }

    // Batch-load projects for all stacks
    const stackIds = stacks.map((s) => s.id);
    const allProjectLinks =
      stackIds.length > 0
        ? await getDb()
            .select({
              stackId: projectStack.stackId,
              projectId: project.id,
              projectName: project.title,
              projectLogo: project.logo
            })
            .from(projectStack)
            .innerJoin(project, eq(projectStack.projectId, project.id))
            .where(inArray(projectStack.stackId, stackIds))
        : [];

    const projectsByStack = new Map<
      string,
      Array<{ id: string; name: string; logo: string | null }>
    >();
    for (const link of allProjectLinks) {
      const list = projectsByStack.get(link.stackId) ?? [];
      list.push({ id: link.projectId, name: link.projectName, logo: link.projectLogo });
      projectsByStack.set(link.stackId, list);
    }

    return stacks.map((s) => {
      return {
        ...s,
        dependencies: (depsByStack.get(s.id) ?? []).map((d) => {
          return {
            npmPackage: d.npmPackage,
            description: d.description,
            homepage: d.homepage
          };
        }),
        projects: projectsByStack.get(s.id) ?? []
      };
    });
  },

  async findOptedIn(extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(
        extraWhere
          ? and(isNotNull(stack.portfolioEntryId), extraWhere)
          : isNotNull(stack.portfolioEntryId)
      )
      .orderBy(stack.sortOrder, stack.name);

    const results = await Promise.all(rows.map(({ id }) => this.findById(id)!));

    return results.map((row) => {
      if (!row) return row;
      return {
        ...row,
        projects: row.projects
          ?.filter(
            (ps): ps is typeof ps & { project: NonNullable<typeof ps.project> } =>
              ps.project != null
          )
          .map((ps) => {
            return {
              id: ps.project.id,
              name: ps.project.title,
              logo: ps.project.logo
            };
          })
      };
    });
  },

  async findById(id: string) {
    return getDb().query.stack.findFirst({
      where: { id },
      with: {
        projects: {
          with: {
            project: {
              columns: { id: true, title: true, logo: true }
            }
          }
        }
      }
    });
  },

  async findByName(name: string) {
    return getDb().query.stack.findFirst({ where: { name } });
  },

  async findByNpmPackageAlias(npmPackage: string) {
    const alias = await getDb().query.stackDependency.findFirst({
      where: { npmPackage }
    });
    if (!alias) return null;
    return getDb().query.stack.findFirst({ where: { id: alias.stackId } });
  },

  async findManyById(ids: string[]) {
    if (ids.length === 0) return [];
    return getDb().query.stack.findMany({
      where: { id: { in: ids } }
    });
  },

  async create(
    input: CreateStackData,
    options?: {
      includedInPortfolio?: boolean;
      dependencies?: Array<{
        npmPackage: string;
        description?: string | null;
        homepage?: string | null;
      }>;
      projectIds?: string[];
    }
  ) {
    const id = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          type: "stack",
          entityId: id
        });
      }

      await tx.insert(stack).values({
        id,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        type: input.type ?? null,
        confidence: input.confidence ?? null,
        sortOrder: input.sortOrder ?? 0,
        portfolioEntryId: pid
      });

      if (options?.dependencies && options.dependencies.length > 0) {
        for (const dep of options.dependencies) {
          await tx
            .delete(stackDependency)
            .where(
              and(eq(stackDependency.npmPackage, dep.npmPackage), ne(stackDependency.stackId, id))
            );
          await tx
            .insert(stackDependency)
            .values({
              id: crypto.randomUUID(),
              stackId: id,
              npmPackage: dep.npmPackage,
              description: dep.description ?? null,
              homepage: dep.homepage ?? null,
              lastRefreshedAt: null
            })
            .onConflictDoNothing({ target: stackDependency.npmPackage });
        }
      }

      if (options?.projectIds && options.projectIds.length > 0) {
        const unique = [...new Set(options.projectIds)];
        const existingProjects = await tx
          .select({ id: project.id })
          .from(project)
          .where(inArray(project.id, unique));
        if (existingProjects.length !== unique.length) {
          throw new Error("One or more projects not found");
        }
        await tx.insert(projectStack).values(
          unique.map((projectId) => {
            return { id: crypto.randomUUID(), projectId, stackId: id };
          })
        );
      }
    });

    return stackRepository.findById(id);
  },

  async update(
    id: string,
    input: UpdateStackData,
    options?: {
      includedInPortfolio?: boolean;
      dependencies?: Array<{
        npmPackage: string;
        description?: string | null;
        homepage?: string | null;
      }>;
      projectIds?: string[];
    }
  ) {
    return getDb().transaction(async (tx) => {
      const [updated] = await tx.update(stack).set(input).where(eq(stack.id, id)).returning();

      if (!updated) return null;

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { type: "stack", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            type: "stack",
            entityId: id
          });
          await tx.update(stack).set({ portfolioEntryId: pid }).where(eq(stack.id, id));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(and(eq(portfolioEntry.type, "stack"), eq(portfolioEntry.entityId, id)));
        }
      }

      if (options?.dependencies !== undefined) {
        await tx.delete(stackDependency).where(eq(stackDependency.stackId, id));
        for (const dep of options.dependencies) {
          await tx
            .delete(stackDependency)
            .where(
              and(eq(stackDependency.npmPackage, dep.npmPackage), ne(stackDependency.stackId, id))
            );
          await tx
            .insert(stackDependency)
            .values({
              id: crypto.randomUUID(),
              stackId: id,
              npmPackage: dep.npmPackage,
              description: dep.description ?? null,
              homepage: dep.homepage ?? null,
              lastRefreshedAt: null
            })
            .onConflictDoNothing({ target: stackDependency.npmPackage });
        }
      }

      if (options?.projectIds !== undefined) {
        await tx.delete(projectStack).where(eq(projectStack.stackId, id));
        if (options.projectIds.length > 0) {
          const unique = [...new Set(options.projectIds)];
          const existingProjects = await tx
            .select({ id: project.id })
            .from(project)
            .where(inArray(project.id, unique));
          if (existingProjects.length !== unique.length) {
            throw new Error("One or more projects not found");
          }
          await tx.insert(projectStack).values(
            unique.map((projectId) => {
              return { id: crypto.randomUUID(), projectId, stackId: id };
            })
          );
        }
      }

      return tx.query.stack.findFirst({ where: { id } });
    });
  },

  async batchUpdate(
    items: { id: string; data: UpdateStackData; options?: { includedInPortfolio?: boolean } }[]
  ) {
    if (items.length === 0) return [];

    return getDb().transaction(async (tx) => {
      const results: { id: string; name: string }[] = [];

      for (const { id, data, options } of items) {
        const filtered = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined)
        ) as UpdateStackData;
        if (Object.keys(filtered).length === 0) continue;
        const [updated] = await tx.update(stack).set(filtered).where(eq(stack.id, id)).returning();

        if (!updated) continue;

        if (options?.includedInPortfolio !== undefined) {
          const existing = await tx.query.portfolioEntry.findFirst({
            where: { type: "stack", entityId: id }
          });

          if (options.includedInPortfolio && !existing) {
            const pid = crypto.randomUUID();
            await tx.insert(portfolioEntry).values({
              id: pid,
              type: "stack",
              entityId: id
            });
            await tx.update(stack).set({ portfolioEntryId: pid }).where(eq(stack.id, id));
          } else if (!options.includedInPortfolio && existing) {
            await tx
              .delete(portfolioEntry)
              .where(and(eq(portfolioEntry.type, "stack"), eq(portfolioEntry.entityId, id)));
          }
        }

        const final = await tx.query.stack.findFirst({ where: { id } });
        if (final) results.push({ id: final.id, name: final.name });
      }

      return results;
    });
  },

  async reorder(items: ReorderStackItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(inArray(stack.id, ids));

    if (existing.length !== ids.length) {
      throw new Error("One or more stacks not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx.update(stack).set({ sortOrder: item.sortOrder }).where(eq(stack.id, item.id));
      }
    });
  },

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(stack)
      .where(eq(stack.id, id))
      .returning({ id: stack.id });

    return deleted ?? null;
  },

  async getUsageCount(stackId: string) {
    const result = await getDb()
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(projectStack)
      .where(eq(projectStack.stackId, stackId));
    return result[0]?.count ?? 0;
  },

  async merge(survivorId: string, victimId: string) {
    if (survivorId === victimId) {
      throw new Error("Cannot merge a stack into itself");
    }

    return getDb().transaction(async (tx) => {
      const [survivor, victim] = await Promise.all([
        tx.query.stack.findFirst({ where: { id: survivorId } }),
        tx.query.stack.findFirst({ where: { id: victimId } })
      ]);

      if (!survivor) throw new Error("Survivor stack not found");
      if (!victim) throw new Error("Victim stack not found");

      // Move project_stack links from victim → survivor (skip duplicates)
      const victimLinks = await tx
        .select({ projectId: projectStack.projectId })
        .from(projectStack)
        .where(eq(projectStack.stackId, victimId));

      const survivorLinkProjects = new Set(
        (
          await tx
            .select({ projectId: projectStack.projectId })
            .from(projectStack)
            .where(eq(projectStack.stackId, survivorId))
        ).map((r) => r.projectId)
      );

      for (const link of victimLinks) {
        if (!survivorLinkProjects.has(link.projectId)) {
          await tx
            .update(projectStack)
            .set({ stackId: survivorId })
            .where(
              and(eq(projectStack.stackId, victimId), eq(projectStack.projectId, link.projectId))
            );
        } else {
          await tx
            .delete(projectStack)
            .where(
              and(eq(projectStack.stackId, victimId), eq(projectStack.projectId, link.projectId))
            );
        }
      }

      // Move stack dependencies from victim → survivor (skip duplicates)
      const victimAliases = await tx
        .select({ id: stackDependency.id, npmPackage: stackDependency.npmPackage })
        .from(stackDependency)
        .where(eq(stackDependency.stackId, victimId));

      const survivorAliasSet = new Set(
        (
          await tx
            .select({ npmPackage: stackDependency.npmPackage })
            .from(stackDependency)
            .where(eq(stackDependency.stackId, survivorId))
        ).map((r) => r.npmPackage)
      );

      for (const alias of victimAliases) {
        if (!survivorAliasSet.has(alias.npmPackage)) {
          await tx
            .update(stackDependency)
            .set({ stackId: survivorId })
            .where(eq(stackDependency.id, alias.id));
        } else {
          await tx.delete(stackDependency).where(eq(stackDependency.id, alias.id));
        }
      }

      // Delete victim
      await tx.delete(stack).where(eq(stack.id, victimId));

      return {
        merged: { id: survivor.id, name: survivor.name }
      };
    });
  },

  async batchMerge(items: { survivorId: string; victimId: string }[]) {
    if (items.length === 0) return [];

    return getDb().transaction(async (tx) => {
      const results: Array<{
        merged: { id: string; name: string };
      }> = [];

      for (const { survivorId, victimId } of items) {
        if (survivorId === victimId) continue;

        const [survivor, victim] = await Promise.all([
          tx.query.stack.findFirst({ where: { id: survivorId } }),
          tx.query.stack.findFirst({ where: { id: victimId } })
        ]);

        if (!survivor || !victim) continue;

        // Move project_stack links from victim → survivor (skip duplicates)
        const victimLinks = await tx
          .select({ projectId: projectStack.projectId })
          .from(projectStack)
          .where(eq(projectStack.stackId, victimId));

        const survivorLinkProjects = new Set(
          (
            await tx
              .select({ projectId: projectStack.projectId })
              .from(projectStack)
              .where(eq(projectStack.stackId, survivorId))
          ).map((r) => r.projectId)
        );

        for (const link of victimLinks) {
          if (!survivorLinkProjects.has(link.projectId)) {
            await tx
              .update(projectStack)
              .set({ stackId: survivorId })
              .where(
                and(eq(projectStack.stackId, victimId), eq(projectStack.projectId, link.projectId))
              );
          } else {
            await tx
              .delete(projectStack)
              .where(
                and(eq(projectStack.stackId, victimId), eq(projectStack.projectId, link.projectId))
              );
          }
        }

        // Move stack dependencies from victim → survivor (skip duplicates)
        const victimAliases = await tx
          .select({ id: stackDependency.id, npmPackage: stackDependency.npmPackage })
          .from(stackDependency)
          .where(eq(stackDependency.stackId, victimId));

        const survivorAliasSet = new Set(
          (
            await tx
              .select({ npmPackage: stackDependency.npmPackage })
              .from(stackDependency)
              .where(eq(stackDependency.stackId, survivorId))
          ).map((r) => r.npmPackage)
        );

        for (const alias of victimAliases) {
          if (!survivorAliasSet.has(alias.npmPackage)) {
            await tx
              .update(stackDependency)
              .set({ stackId: survivorId })
              .where(eq(stackDependency.id, alias.id));
          } else {
            await tx.delete(stackDependency).where(eq(stackDependency.id, alias.id));
          }
        }

        // Delete victim
        await tx.delete(stack).where(eq(stack.id, victimId));

        results.push({
          merged: { id: survivor.id, name: survivor.name }
        });
      }

      return results;
    });
  }
};
