import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
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

/** Opaque cursor for experiences ordered by (sortOrder, title, id). */
export type ExperienceListCursor = {
  sortOrder: number;
  title: string;
  id: string;
};

function encodeExperienceListCursor(
  row: Pick<ExperienceListCursor, "sortOrder" | "title" | "id">
): string {
  return Buffer.from(
    JSON.stringify({
      sortOrder: row.sortOrder,
      title: row.title,
      id: row.id
    } satisfies ExperienceListCursor),
    "utf8"
  ).toString("base64url");
}

function decodeExperienceListCursor(cursor: string): ExperienceListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ExperienceListCursor).sortOrder !== "number" ||
      typeof (parsed as ExperienceListCursor).title !== "string" ||
      typeof (parsed as ExperienceListCursor).id !== "string"
    ) {
      return null;
    }
    return parsed as ExperienceListCursor;
  } catch {
    return null;
  }
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
   * Order: sortOrder ASC, title ASC, id ASC (stable).
   * Full row + projects/stacks (same shape as findAllByUserId).
   */
  async findPageByUserId(userId: string, options: { cursor?: string | null; limit: number }) {
    const limit = options.limit;
    const cursor =
      options.cursor != null && options.cursor !== ""
        ? decodeExperienceListCursor(options.cursor)
        : null;

    const cursorWhere =
      cursor == null
        ? undefined
        : or(
            gt(experience.sortOrder, cursor.sortOrder),
            and(eq(experience.sortOrder, cursor.sortOrder), gt(experience.title, cursor.title)),
            and(
              eq(experience.sortOrder, cursor.sortOrder),
              eq(experience.title, cursor.title),
              gt(experience.id, cursor.id)
            )
          );

    const whereClause =
      cursorWhere == null
        ? eq(experience.userId, userId)
        : and(eq(experience.userId, userId), cursorWhere);

    const [rows, countRow] = await Promise.all([
      getDb()
        .select({
          id: experience.id,
          sortOrder: experience.sortOrder,
          title: experience.title
        })
        .from(experience)
        .where(whereClause)
        .orderBy(asc(experience.sortOrder), asc(experience.title), asc(experience.id))
        .limit(limit + 1),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(experience)
        .where(eq(experience.userId, userId))
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
    const nextCursor = hasMore && last != null ? encodeExperienceListCursor(last) : null;

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
