import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { portfolioEntry, type PortfolioEntryType } from "#@/schema/portfolio-entry.schema";

export type PortfolioEntryEntity = InferSelectModel<typeof portfolioEntry>;
export type CreatePortfolioEntryData = Omit<
  InferInsertModel<typeof portfolioEntry>,
  "id" | "createdAt" | "updatedAt"
>;

export const portfolioEntryRepository = {
  async findByTypeAndEntityId(type: PortfolioEntryType, entityId: string) {
    return getDb().query.portfolioEntry.findFirst({
      where: { type, entityId }
    });
  },

  async findById(id: string) {
    return getDb().query.portfolioEntry.findFirst({ where: { id } });
  },

  async create(input: CreatePortfolioEntryData) {
    const [created] = await getDb()
      .insert(portfolioEntry)
      .values({
        id: crypto.randomUUID(),
        type: input.type,
        entityId: input.entityId
      })
      .returning();

    return created ?? null;
  },

  async deleteByTypeAndEntityId(type: PortfolioEntryType, entityId: string) {
    const [deleted] = await getDb()
      .delete(portfolioEntry)
      .where(and(eq(portfolioEntry.type, type), eq(portfolioEntry.entityId, entityId)))
      .returning({ id: portfolioEntry.id });

    return deleted ?? null;
  },

  async deleteById(id: string) {
    const [deleted] = await getDb()
      .delete(portfolioEntry)
      .where(eq(portfolioEntry.id, id))
      .returning({ id: portfolioEntry.id });

    return deleted ?? null;
  }
};
