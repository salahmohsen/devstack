import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { education } from "../schema/education.schema.ts";

export type EducationEntity = InferSelectModel<typeof education>;

export type CreateEducationData = Omit<
  InferInsertModel<typeof education>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateEducationData = Partial<Omit<CreateEducationData, "userId">>;
export type ReorderEducationItem = { id: string; sortOrder: number };

export const educationRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.education.findMany({
      where: { userId },
      orderBy: (edu, { asc }) => [asc(edu.sortOrder), asc(edu.id)]
    });
  },

  async findByIdForUser(id: string, userId: string) {
    const [row] = await getDb()
      .select()
      .from(education)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateEducationData) {
    const all = await educationRepository.findAllByUserId(input.userId);
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;
    const [row] = await getDb()
      .insert(education)
      .values({
        id: crypto.randomUUID(),
        ...input,
        sortOrder: input.sortOrder ?? nextSortOrder
      })
      .returning();
    return row ?? null;
  },

  async update(id: string, userId: string, input: UpdateEducationData) {
    const [row] = await getDb()
      .update(education)
      .set(input)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .returning();
    return row ?? null;
  },

  /** Persist display order; all ids must belong to the user. */
  async reorder(userId: string, items: ReorderEducationItem[]) {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    const owned = await educationRepository.findAllByUserId(userId);
    const ownedIds = new Set(owned.map((row) => row.id));
    for (const id of ids) {
      if (!ownedIds.has(id)) throw new Error("education_reorder_foreign_id");
    }
    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(education)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(education.id, item.id), eq(education.userId, userId)));
      }
    });
  },

  async delete(id: string, userId: string) {
    const deleted = await getDb()
      .delete(education)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .returning({ id: education.id });
    return deleted[0] ?? null;
  }
};
