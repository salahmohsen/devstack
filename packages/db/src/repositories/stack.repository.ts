import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
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
export type UpdateStackData = Partial<Omit<CreateStackData, "userId">>;
export type ReorderStackItem = { id: string; sortOrder: number };

export type StackListSortKey = "sortOrder" | "name" | "projectCount" | "updatedAt";

/** Opaque cursor: active sort column(s) + id. Default is (sortOrder, name, id). */
export type StackListCursor =
  | { sortBy: "sortOrder"; sortOrder: number; name: string; id: string }
  | { sortBy: "name"; name: string; id: string }
  | { sortBy: "projectCount"; projectCount: number; id: string }
  | { sortBy: "updatedAt"; updatedAt: string; id: string };

export type StackListPageOptions = {
  cursor?: string | null;
  limit: number;
  where?: SQL;
  sortBy?: StackListSortKey;
  sortDir?: "asc" | "desc";
};

export type StackListRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  type: string | null;
  healthStatus: StackEntity["healthStatus"];
  confidence: string | null;
  sortOrder: number;
  isFeatured: boolean;
  aliases: string[];
  portfolioEntryId: string | null;
  updatedAt: Date;
  createdAt: Date;
  projectCount: number;
};

const ALTERNATIVE_NAMES_MAX = 20;

function mergeAlternativeNames(
  survivorName: string,
  survivorNames: string[] | null | undefined,
  victimName: string,
  victimNames: string[] | null | undefined
): string[] {
  const skip = new Set<string>([survivorName.trim().toLowerCase()].filter(Boolean));
  const out: string[] = [];
  for (const raw of [...(survivorNames ?? []), victimName, ...(victimNames ?? [])]) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (skip.has(key)) continue;
    skip.add(key);
    out.push(name);
    if (out.length >= ALTERNATIVE_NAMES_MAX) break;
  }
  return out;
}

function projectCountSubquery() {
  return getDb()
    .select({
      stackId: projectStack.stackId,
      count: sql<number>`count(*)::int`.as("count")
    })
    .from(projectStack)
    .groupBy(projectStack.stackId)
    .as("project_counts");
}

function encodeStackListCursor(cursor: StackListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeStackListCursor(cursor: string): StackListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed.id !== "string") return null;

    const sortBy = parsed.sortBy;
    if (sortBy === "name" && typeof parsed.name === "string") {
      return { sortBy: "name", name: parsed.name, id: parsed.id };
    }
    if (sortBy === "projectCount" && typeof parsed.projectCount === "number") {
      return { sortBy: "projectCount", projectCount: parsed.projectCount, id: parsed.id };
    }
    if (sortBy === "updatedAt" && typeof parsed.updatedAt === "string") {
      return { sortBy: "updatedAt", updatedAt: parsed.updatedAt, id: parsed.id };
    }
    if (
      (sortBy === "sortOrder" || sortBy === undefined) &&
      typeof parsed.sortOrder === "number" &&
      typeof parsed.name === "string"
    ) {
      return { sortBy: "sortOrder", sortOrder: parsed.sortOrder, name: parsed.name, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

function andAll(parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return and(...present);
}

function encodeRowCursor(row: StackListRow, sortBy: StackListSortKey): StackListCursor {
  if (sortBy === "name") return { sortBy: "name", name: row.name, id: row.id };
  if (sortBy === "projectCount") {
    return { sortBy: "projectCount", projectCount: row.projectCount, id: row.id };
  }
  if (sortBy === "updatedAt") {
    return { sortBy: "updatedAt", updatedAt: row.updatedAt.toISOString(), id: row.id };
  }
  return { sortBy: "sortOrder", sortOrder: row.sortOrder, name: row.name, id: row.id };
}

export const stackRepository = {
  async findAllByUserId(userId: string): Promise<StackListRow[]> {
    const counts = projectCountSubquery();

    return getDb()
      .select({
        id: stack.id,
        userId: stack.userId,
        name: stack.name,
        description: stack.description,
        icon: stack.icon,
        type: stack.type,
        healthStatus: stack.healthStatus,
        confidence: stack.confidence,
        sortOrder: stack.sortOrder,
        isFeatured: stack.isFeatured,
        aliases: stack.aliases,
        portfolioEntryId: stack.portfolioEntryId,
        updatedAt: stack.updatedAt,
        createdAt: stack.createdAt,
        projectCount: sql<number>`coalesce(${counts.count}, 0)`.as("project_count")
      })
      .from(stack)
      .leftJoin(counts, eq(stack.id, counts.stackId))
      .where(eq(stack.userId, userId))
      .orderBy(asc(stack.sortOrder), asc(stack.name), asc(stack.id));
  },

  /**
   * Cursor page for dashboard infinite scroll.
   * Default order: sortOrder ASC, name ASC, id ASC.
   * Display sort keysets on the active column(s) + id. `where` is precompiled SQL.
   */
  async findPageByUserId(
    userId: string,
    options: StackListPageOptions
  ): Promise<{ items: StackListRow[]; nextCursor: string | null; totalCount: number }> {
    const counts = projectCountSubquery();
    const limit = options.limit;
    const sortBy = options.sortBy ?? "sortOrder";
    const sortDir = options.sortDir ?? "asc";
    const dir = sortDir === "desc" ? desc : asc;
    const after = sortDir === "desc" ? lt : gt;

    const decoded =
      options.cursor != null && options.cursor !== ""
        ? decodeStackListCursor(options.cursor)
        : null;
    const cursor = decoded?.sortBy === sortBy ? decoded : null;

    const projectCountExpr = sql<number>`coalesce(${counts.count}, 0)`;

    let cursorWhere: SQL | undefined;
    if (cursor?.sortBy === "sortOrder") {
      cursorWhere = or(
        after(stack.sortOrder, cursor.sortOrder),
        and(eq(stack.sortOrder, cursor.sortOrder), after(stack.name, cursor.name)),
        and(
          eq(stack.sortOrder, cursor.sortOrder),
          eq(stack.name, cursor.name),
          after(stack.id, cursor.id)
        )
      );
    } else if (cursor?.sortBy === "name") {
      cursorWhere = or(
        after(stack.name, cursor.name),
        and(eq(stack.name, cursor.name), after(stack.id, cursor.id))
      );
    } else if (cursor?.sortBy === "projectCount") {
      cursorWhere = or(
        after(projectCountExpr, cursor.projectCount),
        and(eq(projectCountExpr, cursor.projectCount), after(stack.id, cursor.id))
      );
    } else if (cursor?.sortBy === "updatedAt") {
      const at = new Date(cursor.updatedAt);
      if (!Number.isNaN(at.getTime())) {
        cursorWhere = or(
          after(stack.updatedAt, at),
          and(eq(stack.updatedAt, at), after(stack.id, cursor.id))
        );
      }
    }

    const filterWhere = andAll([eq(stack.userId, userId), options.where]);
    const pageWhere = andAll([filterWhere, cursorWhere]) ?? eq(stack.userId, userId);

    const orderBy =
      sortBy === "name"
        ? [dir(stack.name), dir(stack.id)]
        : sortBy === "projectCount"
          ? [dir(projectCountExpr), dir(stack.id)]
          : sortBy === "updatedAt"
            ? [dir(stack.updatedAt), dir(stack.id)]
            : [dir(stack.sortOrder), dir(stack.name), dir(stack.id)];

    const [rows, countRow] = await Promise.all([
      getDb()
        .select({
          id: stack.id,
          userId: stack.userId,
          name: stack.name,
          description: stack.description,
          icon: stack.icon,
          type: stack.type,
          healthStatus: stack.healthStatus,
          confidence: stack.confidence,
          sortOrder: stack.sortOrder,
          isFeatured: stack.isFeatured,
          aliases: stack.aliases,
          portfolioEntryId: stack.portfolioEntryId,
          updatedAt: stack.updatedAt,
          createdAt: stack.createdAt,
          projectCount: projectCountExpr.as("project_count")
        })
        .from(stack)
        .leftJoin(counts, eq(stack.id, counts.stackId))
        .where(pageWhere)
        .orderBy(...orderBy)
        .limit(limit + 1),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(stack)
        .where(filterWhere)
        .then((r) => r[0]?.count ?? 0)
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last != null ? encodeStackListCursor(encodeRowCursor(last, sortBy)) : null;

    return { items, nextCursor, totalCount: countRow };
  },

  async findAllWithDependenciesByUserId(userId: string) {
    const stacks = await this.findAllByUserId(userId);
    const stackIds = stacks.map((s) => s.id);
    const allDeps =
      stackIds.length > 0 ? await stackDependencyRepository.findByStackIds(stackIds) : [];

    const depsByStack = new Map<string, typeof allDeps>();
    for (const dep of allDeps) {
      const list = depsByStack.get(dep.stackId) ?? [];
      list.push(dep);
      depsByStack.set(dep.stackId, list);
    }

    // Batch-load projects for all stacks
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
            .where(and(inArray(projectStack.stackId, stackIds), eq(project.userId, userId)))
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

  async findOptedInByUserId(userId: string, extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(
        extraWhere
          ? and(eq(stack.userId, userId), isNotNull(stack.portfolioEntryId), extraWhere)
          : and(eq(stack.userId, userId), isNotNull(stack.portfolioEntryId))
      )
      .orderBy(stack.sortOrder, stack.name);

    const results = await Promise.all(rows.map(({ id }) => this.findByIdForUser(id, userId)!));

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

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.stack.findFirst({
      where: { id, userId },
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

  /** Linked projects for inspect — explicit join, not the relational `with` shape. */
  async findLinkedProjectsForUser(stackId: string, userId: string) {
    return getDb()
      .select({
        id: project.id,
        name: project.title,
        logo: project.logo
      })
      .from(projectStack)
      .innerJoin(project, eq(projectStack.projectId, project.id))
      .where(and(eq(projectStack.stackId, stackId), eq(project.userId, userId)));
  },

  async findByNameForUser(userId: string, name: string) {
    return getDb().query.stack.findFirst({ where: { userId, name } });
  },

  async findByNpmPackageAliasForUser(userId: string, npmPackage: string) {
    const alias = await getDb().query.stackDependency.findFirst({
      where: { npmPackage }
    });
    if (!alias) return null;
    return getDb().query.stack.findFirst({ where: { id: alias.stackId, userId } });
  },

  async findManyByIdForUser(userId: string, ids: string[]) {
    if (ids.length === 0) return [];
    return getDb().query.stack.findMany({
      where: { userId, id: { in: ids } }
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
          userId: input.userId,
          type: "stack",
          entityId: id
        });
      }

      await tx.insert(stack).values({
        id,
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        type: input.type ?? null,
        healthStatus: input.healthStatus ?? null,
        confidence: input.confidence ?? null,
        sortOrder: input.sortOrder ?? 0,
        isFeatured: input.isFeatured ?? false,
        aliases: input.aliases ?? [],
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
          .where(and(eq(project.userId, input.userId), inArray(project.id, unique)));
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

    return stackRepository.findByIdForUser(id, input.userId);
  },

  async update(
    id: string,
    userId: string,
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
      const [updated] = await tx
        .update(stack)
        .set(input)
        .where(and(eq(stack.id, id), eq(stack.userId, userId)))
        .returning();

      if (!updated) return null;

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { userId, type: "stack", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            userId,
            type: "stack",
            entityId: id
          });
          await tx
            .update(stack)
            .set({ portfolioEntryId: pid })
            .where(and(eq(stack.id, id), eq(stack.userId, userId)));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(
              and(
                eq(portfolioEntry.userId, userId),
                eq(portfolioEntry.type, "stack"),
                eq(portfolioEntry.entityId, id)
              )
            );
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
            .where(and(eq(project.userId, userId), inArray(project.id, unique)));
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

      return tx.query.stack.findFirst({ where: { id, userId } });
    });
  },

  async batchUpdate(
    userId: string,
    items: { id: string; data: UpdateStackData; options?: { includedInPortfolio?: boolean } }[]
  ) {
    if (items.length === 0) return [];

    return getDb().transaction(async (tx) => {
      const results: { id: string; name: string }[] = [];

      for (const { id, data, options } of items) {
        const filtered = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined)
        ) as UpdateStackData;
        const hasColumns = Object.keys(filtered).length > 0;
        if (!hasColumns && options?.includedInPortfolio === undefined) continue;

        let updated: StackEntity | undefined;
        if (hasColumns) {
          const [row] = await tx
            .update(stack)
            .set(filtered)
            .where(and(eq(stack.id, id), eq(stack.userId, userId)))
            .returning();
          updated = row;
        } else {
          const row = await tx.query.stack.findFirst({ where: { id, userId } });
          updated = row ?? undefined;
        }

        if (!updated) continue;

        if (options?.includedInPortfolio !== undefined) {
          const existing = await tx.query.portfolioEntry.findFirst({
            where: { userId, type: "stack", entityId: id }
          });

          if (options.includedInPortfolio && !existing) {
            const pid = crypto.randomUUID();
            await tx.insert(portfolioEntry).values({
              id: pid,
              userId,
              type: "stack",
              entityId: id
            });
            await tx
              .update(stack)
              .set({ portfolioEntryId: pid })
              .where(and(eq(stack.id, id), eq(stack.userId, userId)));
          } else if (!options.includedInPortfolio && existing) {
            await tx
              .delete(portfolioEntry)
              .where(
                and(
                  eq(portfolioEntry.userId, userId),
                  eq(portfolioEntry.type, "stack"),
                  eq(portfolioEntry.entityId, id)
                )
              );
          }
        }

        const final = await tx.query.stack.findFirst({ where: { id, userId } });
        if (final) results.push({ id: final.id, name: final.name });
      }

      return results;
    });
  },

  async reorder(userId: string, items: ReorderStackItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(and(eq(stack.userId, userId), inArray(stack.id, ids)));

    if (existing.length !== ids.length) {
      throw new Error("One or more stacks not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(stack)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(stack.id, item.id), eq(stack.userId, userId)));
      }
    });
  },

  async delete(id: string, userId: string) {
    const [deleted] = await getDb()
      .delete(stack)
      .where(and(eq(stack.id, id), eq(stack.userId, userId)))
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

  async merge(userId: string, survivorId: string, victimId: string) {
    if (survivorId === victimId) {
      throw new Error("Cannot merge a stack into itself");
    }

    return getDb().transaction(async (tx) => {
      const [survivor, victim] = await Promise.all([
        tx.query.stack.findFirst({ where: { id: survivorId, userId } }),
        tx.query.stack.findFirst({ where: { id: victimId, userId } })
      ]);

      if (!survivor) throw new Error("Survivor stack not found");
      if (!victim) throw new Error("Victim stack not found");

      const mergedNames = mergeAlternativeNames(
        survivor.name,
        survivor.aliases,
        victim.name,
        victim.aliases
      );
      if (mergedNames.length > 0) {
        await tx
          .update(stack)
          .set({ aliases: mergedNames })
          .where(and(eq(stack.id, survivorId), eq(stack.userId, userId)));
      }

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
      await tx.delete(stack).where(and(eq(stack.id, victimId), eq(stack.userId, userId)));

      return {
        merged: { id: survivor.id, name: survivor.name }
      };
    });
  },

  async batchMerge(userId: string, items: { survivorId: string; victimId: string }[]) {
    if (items.length === 0) return [];

    return getDb().transaction(async (tx) => {
      const results: Array<{
        merged: { id: string; name: string };
      }> = [];

      for (const { survivorId, victimId } of items) {
        if (survivorId === victimId) continue;

        const [survivor, victim] = await Promise.all([
          tx.query.stack.findFirst({ where: { id: survivorId, userId } }),
          tx.query.stack.findFirst({ where: { id: victimId, userId } })
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
        await tx.delete(stack).where(and(eq(stack.id, victimId), eq(stack.userId, userId)));

        results.push({
          merged: { id: survivor.id, name: survivor.name }
        });
      }

      return results;
    });
  }
};
