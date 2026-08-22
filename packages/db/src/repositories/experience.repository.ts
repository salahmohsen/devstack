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
import { experience } from "../schema/experience.schema.ts";
import { portfolioEntry } from "../schema/portfolio-entry.schema.ts";

export type ExperienceEntity = InferSelectModel<typeof experience>;
export type CreateExperienceData = Omit<
  InferInsertModel<typeof experience>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateExperienceData = Partial<Omit<CreateExperienceData, "userId">>;
export type ReorderExperienceItem = { id: string; sortOrder: number };

export type ExperienceListSortKey = "sortOrder" | "fromDate" | "title" | "updatedAt";

/** Opaque cursor: active sort column(s) + id. Default is (sortOrder, title, id). */
export type ExperienceListCursor =
  | { sortBy: "sortOrder"; sortOrder: number; title: string; id: string }
  | { sortBy: "fromDate"; fromDate: string; id: string }
  | { sortBy: "title"; title: string; id: string }
  | { sortBy: "updatedAt"; updatedAt: string; id: string };

export type ExperienceListPageOptions = {
  cursor?: string | null;
  limit: number;
  where?: SQL;
  sortBy?: ExperienceListSortKey;
  sortDir?: "asc" | "desc";
};

type ExperienceListKeyRow = {
  id: string;
  sortOrder: number;
  title: string;
  fromDate: string | null;
  updatedAt: Date;
};

function encodeExperienceListCursor(cursor: ExperienceListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeExperienceListCursor(cursor: string): ExperienceListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed.id !== "string") return null;

    const sortBy = parsed.sortBy;
    if (sortBy === "title" && typeof parsed.title === "string") {
      return { sortBy: "title", title: parsed.title, id: parsed.id };
    }
    if (sortBy === "fromDate" && typeof parsed.fromDate === "string") {
      return { sortBy: "fromDate", fromDate: parsed.fromDate, id: parsed.id };
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

function encodeExperienceRowCursor(
  row: ExperienceListKeyRow,
  sortBy: ExperienceListSortKey
): ExperienceListCursor {
  if (sortBy === "title") return { sortBy: "title", title: row.title, id: row.id };
  if (sortBy === "fromDate") {
    return { sortBy: "fromDate", fromDate: row.fromDate ?? "", id: row.id };
  }
  if (sortBy === "updatedAt") {
    return { sortBy: "updatedAt", updatedAt: row.updatedAt.toISOString(), id: row.id };
  }
  return { sortBy: "sortOrder", sortOrder: row.sortOrder, title: row.title, id: row.id };
}

export const experienceRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.experience.findMany({
      where: { userId },
      orderBy: (exp, { asc }) => [asc(exp.sortOrder), asc(exp.title)],
      with: {
        projects: {
          orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
          with: {
            stacks: {
              with: { stack: true }
            }
          }
        }
      }
    });
  },

  /**
   * Cursor page for dashboard infinite scroll.
   * Default order: sortOrder ASC, title ASC, id ASC.
   * Display sort keysets on the active column(s) + id. `where` is precompiled SQL.
   */
  async findPageByUserId(userId: string, options: ExperienceListPageOptions) {
    const limit = options.limit;
    const sortBy = options.sortBy ?? "sortOrder";
    const sortDir = options.sortDir ?? "asc";
    const dir = sortDir === "desc" ? desc : asc;
    const after = sortDir === "desc" ? lt : gt;
    const fromDateExpr = sql<string>`coalesce(${experience.fromDate}, '')`;

    const decoded =
      options.cursor != null && options.cursor !== ""
        ? decodeExperienceListCursor(options.cursor)
        : null;
    const cursor = decoded?.sortBy === sortBy ? decoded : null;

    let cursorWhere: SQL | undefined;
    if (cursor?.sortBy === "sortOrder") {
      cursorWhere = or(
        after(experience.sortOrder, cursor.sortOrder),
        and(eq(experience.sortOrder, cursor.sortOrder), after(experience.title, cursor.title)),
        and(
          eq(experience.sortOrder, cursor.sortOrder),
          eq(experience.title, cursor.title),
          after(experience.id, cursor.id)
        )
      );
    } else if (cursor?.sortBy === "title") {
      cursorWhere = or(
        after(experience.title, cursor.title),
        and(eq(experience.title, cursor.title), after(experience.id, cursor.id))
      );
    } else if (cursor?.sortBy === "fromDate") {
      cursorWhere = or(
        after(fromDateExpr, cursor.fromDate),
        and(eq(fromDateExpr, cursor.fromDate), after(experience.id, cursor.id))
      );
    } else if (cursor?.sortBy === "updatedAt") {
      const at = new Date(cursor.updatedAt);
      if (!Number.isNaN(at.getTime())) {
        cursorWhere = or(
          after(experience.updatedAt, at),
          and(eq(experience.updatedAt, at), after(experience.id, cursor.id))
        );
      }
    }

    const filterWhere = andAll([eq(experience.userId, userId), options.where]);
    const pageWhere = andAll([filterWhere, cursorWhere]) ?? eq(experience.userId, userId);

    const orderBy =
      sortBy === "title"
        ? [dir(experience.title), dir(experience.id)]
        : sortBy === "fromDate"
          ? [dir(fromDateExpr), dir(experience.id)]
          : sortBy === "updatedAt"
            ? [dir(experience.updatedAt), dir(experience.id)]
            : [dir(experience.sortOrder), dir(experience.title), dir(experience.id)];

    const [rows, countRow] = await Promise.all([
      getDb()
        .select({
          id: experience.id,
          sortOrder: experience.sortOrder,
          title: experience.title,
          fromDate: experience.fromDate,
          updatedAt: experience.updatedAt
        })
        .from(experience)
        .where(pageWhere)
        .orderBy(...orderBy)
        .limit(limit + 1),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(experience)
        .where(filterWhere)
        .then((r) => r[0]?.count ?? 0)
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const ids = pageRows.map((r) => r.id);

    if (ids.length === 0) {
      return { items: [], nextCursor: null, totalCount: countRow };
    }

    const full = await getDb().query.experience.findMany({
      where: { userId, id: { in: ids } },
      with: {
        projects: {
          orderBy: (proj, { asc: orderAsc }) => [orderAsc(proj.sortOrder), orderAsc(proj.title)],
          with: {
            stacks: {
              with: { stack: true }
            }
          }
        }
      }
    });

    const byId = new Map(full.map((e) => [e.id, e] as const));
    const items = ids
      .map((id) => byId.get(id))
      .filter((e): e is NonNullable<typeof e> => e != null);

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last != null
        ? encodeExperienceListCursor(encodeExperienceRowCursor(last, sortBy))
        : null;

    return { items, nextCursor, totalCount: countRow };
  },

  async findOptedInByUserId(userId: string, extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: experience.id })
      .from(experience)
      .where(
        extraWhere
          ? and(eq(experience.userId, userId), isNotNull(experience.portfolioEntryId), extraWhere)
          : and(eq(experience.userId, userId), isNotNull(experience.portfolioEntryId))
      )
      .orderBy(experience.sortOrder, experience.title);

    return Promise.all(rows.map(({ id }) => this.findByIdForUser(id, userId)!));
  },

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.experience.findFirst({
      where: { id, userId },
      with: {
        projects: {
          orderBy: (proj, { asc }) => [asc(proj.sortOrder), asc(proj.title)],
          with: {
            stacks: {
              with: { stack: true }
            }
          }
        }
      }
    });
  },

  async create(input: CreateExperienceData, options?: { includedInPortfolio?: boolean }) {
    const all = await experienceRepository.findAllByUserId(input.userId);
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;
    const id = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      // portfolio_entry first — experience.portfolio_entry_id FK requires parent row.
      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          userId: input.userId,
          type: "experience",
          entityId: id
        });
      }

      await tx.insert(experience).values({
        id,
        userId: input.userId,
        title: input.title,
        organization: input.organization,
        description: input.description,
        fromDate: input.fromDate ?? null,
        toDate: input.toDate ?? null,
        sortOrder: nextSortOrder,
        isPresent: input.isPresent ?? false,
        portfolioEntryId: pid
      });
    });

    return experienceRepository.findByIdForUser(id, input.userId);
  },

  async update(
    id: string,
    userId: string,
    input: UpdateExperienceData,
    options?: { includedInPortfolio?: boolean }
  ) {
    let notFound = false;

    await getDb().transaction(async (tx) => {
      const [updated] = await tx
        .update(experience)
        .set(input)
        .where(and(eq(experience.id, id), eq(experience.userId, userId)))
        .returning();

      if (!updated) {
        notFound = true;
        return;
      }

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { userId, type: "experience", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            userId,
            type: "experience",
            entityId: id
          });
          await tx
            .update(experience)
            .set({ portfolioEntryId: pid })
            .where(and(eq(experience.id, id), eq(experience.userId, userId)));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(
              and(
                eq(portfolioEntry.userId, userId),
                eq(portfolioEntry.type, "experience"),
                eq(portfolioEntry.entityId, id)
              )
            );
          await tx
            .update(experience)
            .set({ portfolioEntryId: null })
            .where(and(eq(experience.id, id), eq(experience.userId, userId)));
        }
      }
    });

    if (notFound) return null;
    return experienceRepository.findByIdForUser(id, userId);
  },

  async reorder(userId: string, items: ReorderExperienceItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: experience.id })
      .from(experience)
      .where(and(eq(experience.userId, userId), inArray(experience.id, ids)));

    if (existing.length !== ids.length) {
      throw new Error("One or more experiences not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(experience)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(experience.id, item.id), eq(experience.userId, userId)));
      }
    });
  },

  async delete(id: string, userId: string) {
    const [deleted] = await getDb()
      .delete(experience)
      .where(and(eq(experience.id, id), eq(experience.userId, userId)))
      .returning({ id: experience.id });

    return deleted ?? null;
  }
};
