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
export type UpdateExperienceData = Partial<CreateExperienceData>;
export type ReorderExperienceItem = { id: string; sortOrder: number };

export const experienceRepository = {
  async findAll() {
    return getDb().query.experience.findMany({
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

  async findOptedIn(extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: experience.id })
      .from(experience)
      .where(
        extraWhere
          ? and(isNotNull(experience.portfolioEntryId), extraWhere)
          : isNotNull(experience.portfolioEntryId)
      )
      .orderBy(experience.sortOrder, experience.title);

    return Promise.all(rows.map(({ id }) => this.findById(id)!));
  },

  async findById(id: string) {
    return getDb().query.experience.findFirst({
      where: { id },
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
    const all = await experienceRepository.findAll();
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;
    const id = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      await tx.insert(experience).values({
        id,
        title: input.title,
        organization: input.organization,
        description: input.description,
        fromDate: input.fromDate ?? null,
        toDate: input.toDate ?? null,
        sortOrder: nextSortOrder,
        isPresent: input.isPresent ?? false,
        portfolioEntryId: pid
      });

      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          type: "experience",
          entityId: id
        });
      }
    });

    return experienceRepository.findById(id);
  },

  async update(
    id: string,
    input: UpdateExperienceData,
    options?: { includedInPortfolio?: boolean }
  ) {
    let notFound = false;

    await getDb().transaction(async (tx) => {
      const [updated] = await tx
        .update(experience)
        .set(input)
        .where(eq(experience.id, id))
        .returning();

      if (!updated) {
        notFound = true;
        return;
      }

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { type: "experience", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            type: "experience",
            entityId: id
          });
          await tx.update(experience).set({ portfolioEntryId: pid }).where(eq(experience.id, id));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(and(eq(portfolioEntry.type, "experience"), eq(portfolioEntry.entityId, id)));
          await tx.update(experience).set({ portfolioEntryId: null }).where(eq(experience.id, id));
        }
      }
    });

    if (notFound) return null;
    return experienceRepository.findById(id);
  },

  async reorder(items: ReorderExperienceItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: experience.id })
      .from(experience)
      .where(inArray(experience.id, ids));

    if (existing.length !== ids.length) {
      throw new Error("One or more experiences not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(experience)
          .set({ sortOrder: item.sortOrder })
          .where(eq(experience.id, item.id));
      }
    });
  },

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(experience)
      .where(eq(experience.id, id))
      .returning({ id: experience.id });

    return deleted ?? null;
  }
};
