import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { portfolioEntry } from "../schema/portfolio-entry.schema.ts";
import { project, projectStack } from "../schema/project.schema.ts";
import { stack } from "../schema/stack.schema.ts";

export type ProjectEntity = InferSelectModel<typeof project>;

export type CreateProjectData = Omit<
  InferInsertModel<typeof project>,
  "id" | "createdAt" | "updatedAt"
> & {
  stackIds?: string[];
};

export type UpdateProjectData = Partial<
  Omit<InferInsertModel<typeof project>, "id" | "createdAt" | "updatedAt" | "userId">
> & {
  stackIds?: string[];
};

export type ReorderProjectItem = { id: string; sortOrder: number };

export type ProjectListSortKey = "sortOrder" | "year" | "title" | "updatedAt";

/** Opaque cursor: active sort column(s) + id. Default is (sortOrder, title, id). */
export type ProjectListCursor =
  | { sortBy: "sortOrder"; sortOrder: number; title: string; id: string }
  | { sortBy: "year"; year: number; id: string }
  | { sortBy: "title"; title: string; id: string }
  | { sortBy: "updatedAt"; updatedAt: string; id: string };

export type ProjectListPageOptions = {
  cursor?: string | null;
  limit: number;
  where?: SQL;
  sortBy?: ProjectListSortKey;
  sortDir?: "asc" | "desc";
};

type ProjectListKeyRow = {
  id: string;
  sortOrder: number;
  title: string;
  year: number;
  updatedAt: Date;
};

function encodeProjectListCursor(cursor: ProjectListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeProjectListCursor(cursor: string): ProjectListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed.id !== "string") return null;

    const sortBy = parsed.sortBy;
    if (sortBy === "title" && typeof parsed.title === "string") {
      return { sortBy: "title", title: parsed.title, id: parsed.id };
    }
    if (sortBy === "year" && typeof parsed.year === "number") {
      return { sortBy: "year", year: parsed.year, id: parsed.id };
    }
    if (sortBy === "updatedAt" && typeof parsed.updatedAt === "string") {
      return { sortBy: "updatedAt", updatedAt: parsed.updatedAt, id: parsed.id };
    }
    if (
      (sortBy === "sortOrder" || sortBy === undefined) &&
      typeof parsed.sortOrder === "number" &&
      typeof parsed.title === "string"
    ) {
      return {
        sortBy: "sortOrder",
        sortOrder: parsed.sortOrder,
        title: parsed.title,
        id: parsed.id
      };
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

function encodeProjectRowCursor(
  row: ProjectListKeyRow,
  sortBy: ProjectListSortKey
): ProjectListCursor {
  if (sortBy === "title") return { sortBy: "title", title: row.title, id: row.id };
  if (sortBy === "year") return { sortBy: "year", year: row.year, id: row.id };
  if (sortBy === "updatedAt") {
    return { sortBy: "updatedAt", updatedAt: row.updatedAt.toISOString(), id: row.id };
  }
  return { sortBy: "sortOrder", sortOrder: row.sortOrder, title: row.title, id: row.id };
}

export const projectRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.project.findMany({
      where: { userId },
      orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  },

  /**
   * Cursor page for dashboard infinite scroll.
   * Default order: sortOrder ASC, title ASC, id ASC.
   * Display sort keysets on the active column(s) + id. `where` is precompiled SQL.
   */
  async findPageByUserId(userId: string, options: ProjectListPageOptions) {
    const limit = options.limit;
    const sortBy = options.sortBy ?? "sortOrder";
    const sortDir = options.sortDir ?? "asc";
    const dir = sortDir === "desc" ? desc : asc;
    const after = sortDir === "desc" ? lt : gt;

    const decoded =
      options.cursor != null && options.cursor !== ""
        ? decodeProjectListCursor(options.cursor)
        : null;
    const cursor = decoded?.sortBy === sortBy ? decoded : null;

    let cursorWhere: SQL | undefined;
    if (cursor?.sortBy === "sortOrder") {
      cursorWhere = or(
        after(project.sortOrder, cursor.sortOrder),
        and(eq(project.sortOrder, cursor.sortOrder), after(project.title, cursor.title)),
        and(
          eq(project.sortOrder, cursor.sortOrder),
          eq(project.title, cursor.title),
          after(project.id, cursor.id)
        )
      );
    } else if (cursor?.sortBy === "title") {
      cursorWhere = or(
        after(project.title, cursor.title),
        and(eq(project.title, cursor.title), after(project.id, cursor.id))
      );
    } else if (cursor?.sortBy === "year") {
      cursorWhere = or(
        after(project.year, cursor.year),
        and(eq(project.year, cursor.year), after(project.id, cursor.id))
      );
    } else if (cursor?.sortBy === "updatedAt") {
      const at = new Date(cursor.updatedAt);
      if (!Number.isNaN(at.getTime())) {
        cursorWhere = or(
          after(project.updatedAt, at),
          and(eq(project.updatedAt, at), after(project.id, cursor.id))
        );
      }
    }

    const filterWhere = andAll([eq(project.userId, userId), options.where]);
    const pageWhere = andAll([filterWhere, cursorWhere]) ?? eq(project.userId, userId);

    const orderBy =
      sortBy === "title"
        ? [dir(project.title), dir(project.id)]
        : sortBy === "year"
          ? [dir(project.year), dir(project.id)]
          : sortBy === "updatedAt"
            ? [dir(project.updatedAt), dir(project.id)]
            : [dir(project.sortOrder), dir(project.title), dir(project.id)];

    const [rows, countRow] = await Promise.all([
      getDb()
        .select({
          id: project.id,
          sortOrder: project.sortOrder,
          title: project.title,
          year: project.year,
          updatedAt: project.updatedAt
        })
        .from(project)
        .where(pageWhere)
        .orderBy(...orderBy)
        .limit(limit + 1),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(project)
        .where(filterWhere)
        .then((r) => r[0]?.count ?? 0)
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const ids = pageRows.map((r) => r.id);

    if (ids.length === 0) {
      return { items: [], nextCursor: null, totalCount: countRow };
    }

    const full = await getDb().query.project.findMany({
      where: { userId, id: { in: ids } },
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });

    const byId = new Map(full.map((p) => [p.id, p] as const));
    const items = ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null);

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last != null
        ? encodeProjectListCursor(encodeProjectRowCursor(last, sortBy))
        : null;

    return { items, nextCursor, totalCount: countRow };
  },

  async findOptedInByUserId(userId: string, extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: project.id })
      .from(project)
      .where(
        extraWhere
          ? and(eq(project.userId, userId), isNotNull(project.portfolioEntryId), extraWhere)
          : and(eq(project.userId, userId), isNotNull(project.portfolioEntryId))
      )
      .orderBy(project.sortOrder, project.title);

    return Promise.all(rows.map(({ id }) => this.findByIdForUser(id, userId)!));
  },

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.project.findFirst({
      where: { id, userId },
      with: {
        stacks: {
          with: { stack: true }
        }
      }
    });
  },

  async create(input: CreateProjectData, options?: { includedInPortfolio?: boolean }) {
    const projectId = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      // portfolio_entry first — project.portfolio_entry_id FK requires parent row.
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          userId: input.userId,
          type: "project",
          entityId: projectId
        });
      }

      await tx.insert(project).values({
        id: projectId,
        userId: input.userId,
        logo: input.logo ?? null,
        repos: input.repos ?? [],
        demoUrl: input.demoUrl ?? null,
        year: input.year,
        title: input.title,
        summary: input.summary,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
        experienceId: input.experienceId ?? null,
        isArchived: input.isArchived ?? false,
        isPresent: input.isPresent ?? false,
        analysis: input.analysis ?? null,
        portfolioEntryId: pid
      });

      if (input.stackIds && input.stackIds.length > 0) {
        const unique = [...new Set(input.stackIds)];
        const existing = await tx
          .select({ id: stack.id })
          .from(stack)
          .where(and(eq(stack.userId, input.userId), inArray(stack.id, unique)));
        if (existing.length !== unique.length) {
          throw new Error("One or more stacks not found");
        }
        await tx.insert(projectStack).values(
          unique.map((stackId) => {
            return { id: crypto.randomUUID(), projectId, stackId };
          })
        );
      }
    });

    return projectRepository.findByIdForUser(projectId, input.userId);
  },

  async update(
    id: string,
    userId: string,
    input: UpdateProjectData,
    options?: { includedInPortfolio?: boolean }
  ) {
    const { stackIds, ...projectFields } = input;
    let notFound = false;

    await getDb().transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (projectFields.logo !== undefined) updateData.logo = projectFields.logo;
      if (projectFields.repos !== undefined) {
        updateData.repos = projectFields.repos;
      }
      if (projectFields.demoUrl !== undefined) {
        updateData.demoUrl = projectFields.demoUrl;
      }
      if (projectFields.year !== undefined) updateData.year = projectFields.year;
      if (projectFields.title !== undefined) updateData.title = projectFields.title;
      if (projectFields.summary !== undefined) updateData.summary = projectFields.summary;
      if (projectFields.description !== undefined) {
        updateData.description = projectFields.description;
      }
      if (projectFields.experienceId !== undefined) {
        updateData.experienceId = projectFields.experienceId;
      }
      if (projectFields.isArchived !== undefined) {
        updateData.isArchived = projectFields.isArchived;
      }
      if (projectFields.isPresent !== undefined) {
        updateData.isPresent = projectFields.isPresent;
      }
      if (projectFields.analysis !== undefined) {
        updateData.analysis = projectFields.analysis;
      }

      // stackIds-only updates leave projectFields empty — skip SET so Drizzle
      // does not reject an empty update (detect-stacks attach path).
      let updated: typeof project.$inferSelect | undefined;
      if (Object.keys(updateData).length > 0) {
        const [row] = await tx
          .update(project)
          .set(updateData)
          .where(and(eq(project.id, id), eq(project.userId, userId)))
          .returning();
        updated = row;
      } else {
        const [row] = await tx
          .select()
          .from(project)
          .where(and(eq(project.id, id), eq(project.userId, userId)))
          .limit(1);
        updated = row;
      }

      if (!updated) {
        notFound = true;
        return;
      }

      if (stackIds !== undefined) {
        await tx.delete(projectStack).where(eq(projectStack.projectId, id));
        if (stackIds.length > 0) {
          const unique = [...new Set(stackIds)];
          const existing = await tx
            .select({ id: stack.id })
            .from(stack)
            .where(and(eq(stack.userId, userId), inArray(stack.id, unique)));
          if (existing.length !== unique.length) {
            throw new Error("One or more stacks not found");
          }
          await tx.insert(projectStack).values(
            unique.map((stackId) => {
              return { id: crypto.randomUUID(), projectId: id, stackId };
            })
          );
        }
      }

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { userId, type: "project", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            userId,
            type: "project",
            entityId: id
          });
          await tx
            .update(project)
            .set({ portfolioEntryId: pid })
            .where(and(eq(project.id, id), eq(project.userId, userId)));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(
              and(
                eq(portfolioEntry.userId, userId),
                eq(portfolioEntry.type, "project"),
                eq(portfolioEntry.entityId, id)
              )
            );
          await tx
            .update(project)
            .set({ portfolioEntryId: null })
            .where(and(eq(project.id, id), eq(project.userId, userId)));
        }
      }
    });

    if (notFound) return null;
    return projectRepository.findByIdForUser(id, userId);
  },

  async reorder(userId: string, items: ReorderProjectItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.userId, userId), inArray(project.id, ids)));

    if (existing.length !== ids.length) {
      throw new Error("One or more projects not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(project)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(project.id, item.id), eq(project.userId, userId)));
      }
    });
  },

  async toggleArchived(id: string, userId: string) {
    const [current] = await getDb()
      .select({ isArchived: project.isArchived })
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .limit(1);

    if (!current) return null;

    const next = !current.isArchived;

    const [updated] = await getDb()
      .update(project)
      .set({ isArchived: next })
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .returning();

    if (!updated) return null;

    return projectRepository.findByIdForUser(updated.id, userId);
  },

  async delete(id: string, userId: string) {
    const [deleted] = await getDb()
      .delete(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .returning({ id: project.id });

    return deleted ?? null;
  }
};
