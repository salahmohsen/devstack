import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { portfolioEntry, type PortfolioEntryType } from "../schema/portfolio-entry.schema.ts";

export type PortfolioEntryEntity = InferSelectModel<typeof portfolioEntry>;
export type CreatePortfolioEntryData = Omit<
  InferInsertModel<typeof portfolioEntry>,
  "id" | "createdAt" | "updatedAt"
>;

export const portfolioEntryRepository = {
  async findByTypeAndEntityIdForUser(userId: string, type: PortfolioEntryType, entityId: string) {
    return getDb().query.portfolioEntry.findFirst({
      where: { userId, type, entityId }
    });
  },

  async findByIdForUser(id: string, userId: string) {
    return getDb().query.portfolioEntry.findFirst({ where: { id, userId } });
  },

  async create(input: CreatePortfolioEntryData) {
    const [created] = await getDb()
      .insert(portfolioEntry)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        entityId: input.entityId
      })
      .returning();

    return created ?? null;
  },

  async deleteByTypeAndEntityIdForUser(userId: string, type: PortfolioEntryType, entityId: string) {
    const [deleted] = await getDb()
      .delete(portfolioEntry)
      .where(
        and(
          eq(portfolioEntry.userId, userId),
          eq(portfolioEntry.type, type),
          eq(portfolioEntry.entityId, entityId)
        )
      )
      .returning({ id: portfolioEntry.id });

    return deleted ?? null;
  },

  async deleteByIdForUser(id: string, userId: string) {
    const [deleted] = await getDb()
      .delete(portfolioEntry)
      .where(and(eq(portfolioEntry.id, id), eq(portfolioEntry.userId, userId)))
      .returning({ id: portfolioEntry.id });

    return deleted ?? null;
  }
};
