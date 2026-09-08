import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { certification } from "../schema/certification.schema.ts";

export type CertificationEntity = InferSelectModel<typeof certification>;

export type CreateCertificationData = Omit<
  InferInsertModel<typeof certification>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCertificationData = Partial<Omit<CreateCertificationData, "userId">>;
export type ReorderCertificationItem = { id: string; sortOrder: number };

export const certificationRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.certification.findMany({
      where: { userId },
      orderBy: (cert, { asc }) => [asc(cert.sortOrder), asc(cert.id)]
    });
  },

  async findByIdForUser(id: string, userId: string) {
    const [row] = await getDb()
      .select()
      .from(certification)
      .where(and(eq(certification.id, id), eq(certification.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateCertificationData) {
    const all = await certificationRepository.findAllByUserId(input.userId);
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((c) => c.sortOrder)) + 1 : 0;
    const [row] = await getDb()
      .insert(certification)
      .values({
        id: crypto.randomUUID(),
        ...input,
        sortOrder: input.sortOrder ?? nextSortOrder
      })
      .returning();
    return row ?? null;
  },

  async update(id: string, userId: string, input: UpdateCertificationData) {
    const [row] = await getDb()
      .update(certification)
      .set(input)
      .where(and(eq(certification.id, id), eq(certification.userId, userId)))
      .returning();
    return row ?? null;
  },

  /** Persist display order; all ids must belong to the user. */
  async reorder(userId: string, items: ReorderCertificationItem[]) {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    const owned = await certificationRepository.findAllByUserId(userId);
    const ownedIds = new Set(owned.map((row) => row.id));
    for (const id of ids) {
      if (!ownedIds.has(id)) throw new Error("certification_reorder_foreign_id");
    }
    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(certification)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(certification.id, item.id), eq(certification.userId, userId)));
      }
    });
  },

  async delete(id: string, userId: string) {
    const deleted = await getDb()
      .delete(certification)
      .where(and(eq(certification.id, id), eq(certification.userId, userId)))
      .returning({ id: certification.id });
    return deleted[0] ?? null;
  }
};
