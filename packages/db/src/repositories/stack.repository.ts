import {
  and,
  eq,
  inArray,
  isNotNull,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "#@/index";
import { portfolioEntry } from "#@/schema/portfolio-entry.schema";
import { projectStack } from "#@/schema/project.schema";
import { stackDependency } from "#@/schema/stack-dependency.schema";
import { stack } from "#@/schema/stack.schema";

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
        npmPackage: stack.npmPackage,
        type: stack.type,
        suggestedIcon: stack.suggestedIcon,
        iconSvg: stack.iconSvg,
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

    return Promise.all(rows.map(({ id }) => this.findById(id)!));
  },

  async findById(id: string) {
    return getDb().query.stack.findFirst({ where: { id } });
  },

  async findByName(name: string) {
    return getDb().query.stack.findFirst({ where: { name } });
  },

  async findByNpmPackage(npmPackage: string) {
    return getDb().query.stack.findFirst({
      where: { npmPackage }
    });
  },

  async findByNpmPackageOrAlias(npmPackage: string) {
    const direct = await this.findByNpmPackage(npmPackage);
    if (direct) return direct;

    const alias = await getDb().query.stackDependency.findFirst({
      where: { npmPackage }
    });
    if (!alias) return null;
    return getDb().query.stack.findFirst({ where: { id: alias.stackId } });
  },

  async findManyByNpmPackages(packages: string[]) {
    if (packages.length === 0) return [];
    return getDb().query.stack.findMany({
      where: { npmPackage: { in: packages } }
    });
  },

  async findManyById(ids: string[]) {
    if (ids.length === 0) return [];
    return getDb().query.stack.findMany({
      where: { id: { in: ids } }
    });
  },

  async create(input: CreateStackData, options?: { includedInPortfolio?: boolean }) {
    const id = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      await tx.insert(stack).values({
        id,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        npmPackage: input.npmPackage ?? null,
        type: input.type ?? null,
        suggestedIcon: input.suggestedIcon ?? null,
        iconSvg: input.iconSvg ?? null,
        confidence: input.confidence ?? null,
        sortOrder: input.sortOrder ?? 0,
        portfolioEntryId: pid
      });

      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          type: "stack",
          entityId: id
        });
      }
    });

    return stackRepository.findById(id);
  },

  async update(id: string, input: UpdateStackData, options?: { includedInPortfolio?: boolean }) {
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
        const [updated] = await tx.update(stack).set(data).where(eq(stack.id, id)).returning();

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

      // Move stack_aliases from victim → survivor (skip duplicates)
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
      if (survivor.npmPackage) survivorAliasSet.add(survivor.npmPackage);

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

      // Create victim.npmPackage → survivor alias (blocks re-detection)
      const aliases: Array<{ id: string; npmPackage: string }> = [];
      const victimPkg = victim.npmPackage;
      if (victimPkg && !survivorAliasSet.has(victimPkg)) {
        const aliasId = crypto.randomUUID();
        const [newAlias] = await tx
          .insert(stackDependency)
          .values({ id: aliasId, stackId: survivorId, npmPackage: victimPkg })
          .returning({ id: stackDependency.id, npmPackage: stackDependency.npmPackage });
        if (newAlias) aliases.push(newAlias);
      }

      // Delete victim
      await tx.delete(stack).where(eq(stack.id, victimId));

      return {
        merged: { id: survivor.id, name: survivor.name },
        aliases
      };
    });
  },

  async batchMerge(items: { survivorId: string; victimId: string }[]) {
    if (items.length === 0) return [];

    return getDb().transaction(async (tx) => {
      const results: Array<{
        merged: { id: string; name: string };
        aliases: Array<{ id: string; npmPackage: string }>;
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

        // Move stack_aliases from victim → survivor (skip duplicates)
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
        if (survivor.npmPackage) survivorAliasSet.add(survivor.npmPackage);

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

        // Create victim.npmPackage → survivor alias (blocks re-detection)
        const aliases: Array<{ id: string; npmPackage: string }> = [];
        const victimPkg = victim.npmPackage;
        if (victimPkg && !survivorAliasSet.has(victimPkg)) {
          const aliasId = crypto.randomUUID();
          const [newAlias] = await tx
            .insert(stackDependency)
            .values({ id: aliasId, stackId: survivorId, npmPackage: victimPkg })
            .returning({ id: stackDependency.id, npmPackage: stackDependency.npmPackage });
          if (newAlias) aliases.push(newAlias);
        }

        // Delete victim
        await tx.delete(stack).where(eq(stack.id, victimId));

        results.push({
          merged: { id: survivor.id, name: survivor.name },
          aliases
        });
      }

      return results;
    });
  }
};
