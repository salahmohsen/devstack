import {
  and,
  eq,
  inArray,
  isNotNull,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "#@/index";
import { portfolioEntry } from "#@/schema/portfolio-entry.schema";
import { stack } from "#@/schema/stack.schema";

export type StackEntity = InferSelectModel<typeof stack>;
export type CreateStackData = Omit<
  InferInsertModel<typeof stack>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateStackData = Partial<CreateStackData>;
export type ReorderStackItem = { id: string; sortOrder: number };

export const stackRepository = {
  async findAll() {
    return getDb().query.stack.findMany({
      orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)]
    });
  },

  async findOptedIn(extraWhere?: SQL) {
    const rows = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(
        extraWhere
          ? and(isNotNull(stack.portfolioEntryId), extraWhere)
          : isNotNull(stack.portfolioEntryId)
      )
      .orderBy(stack.sortOrder, stack.name);

    return Promise.all(rows.map(({ id }) => this.findById(id)!));
  },

  async findById(id: string) {
    return getDb().query.stack.findFirst({ where: { id } });
  },

  async findByName(name: string) {
    return getDb().query.stack.findFirst({ where: { name } });
  },

  async create(input: CreateStackData, options?: { includedInPortfolio?: boolean }) {
    const id = crypto.randomUUID();
    const pid = options?.includedInPortfolio ? crypto.randomUUID() : null;

    await getDb().transaction(async (tx) => {
      await tx.insert(stack).values({
        id,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sortOrder ?? 0,
        portfolioEntryId: pid
      });

      if (pid) {
        await tx.insert(portfolioEntry).values({
          id: pid,
          type: "stack",
          entityId: id
        });
      }
    });

    return stackRepository.findById(id);
  },

  async update(id: string, input: UpdateStackData, options?: { includedInPortfolio?: boolean }) {
    return getDb().transaction(async (tx) => {
      const [updated] = await tx.update(stack).set(input).where(eq(stack.id, id)).returning();

      if (!updated) return null;

      if (options?.includedInPortfolio !== undefined) {
        const existing = await tx.query.portfolioEntry.findFirst({
          where: { type: "stack", entityId: id }
        });

        if (options.includedInPortfolio && !existing) {
          const pid = crypto.randomUUID();
          await tx.insert(portfolioEntry).values({
            id: pid,
            type: "stack",
            entityId: id
          });
          await tx.update(stack).set({ portfolioEntryId: pid }).where(eq(stack.id, id));
        } else if (!options.includedInPortfolio && existing) {
          await tx
            .delete(portfolioEntry)
            .where(and(eq(portfolioEntry.type, "stack"), eq(portfolioEntry.entityId, id)));
        }
      }

      return tx.query.stack.findFirst({ where: { id } });
    });
  },

  async reorder(items: ReorderStackItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const existing = await getDb()
      .select({ id: stack.id })
      .from(stack)
      .where(inArray(stack.id, ids));

    if (existing.length !== ids.length) {
      throw new Error("One or more stacks not found");
    }

    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx.update(stack).set({ sortOrder: item.sortOrder }).where(eq(stack.id, item.id));
      }
    });
  },

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(stack)
      .where(eq(stack.id, id))
      .returning({ id: stack.id });

    return deleted ?? null;
  }
};
