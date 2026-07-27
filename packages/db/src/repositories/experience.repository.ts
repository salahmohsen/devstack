import {
  and,
  eq,
  inArray,
  isNotNull,
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
