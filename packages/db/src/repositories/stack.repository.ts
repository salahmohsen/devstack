import { eq, inArray, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { stack } from "#@/schema/stack.schema";

export type StackEntity = InferSelectModel<typeof stack>;
export type CreateStackData = Omit<
  InferInsertModel<typeof stack>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateStackData = Partial<CreateStackData>;
export type ReorderStackItem = { id: string; sortOrder: number };

class StackRepository {
  async findAll() {
    return getDb().query.stack.findMany({
      orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)]
    });
  }

  async findById(id: string) {
    return getDb().query.stack.findFirst({ where: { id } });
  }

  async findByName(name: string) {
    return getDb().query.stack.findFirst({ where: { name } });
  }

  async create(input: CreateStackData) {
    const [created] = await getDb()
      .insert(stack)
      .values({
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sortOrder ?? 0,
        enableAi: input.enableAi ?? false
      })
      .returning();

    return this.findById(created.id);
  }

  async update(id: string, input: UpdateStackData) {
    const [updated] = await getDb().update(stack).set(input).where(eq(stack.id, id)).returning();

    if (!updated) return null;

    return this.findById(updated.id);
  }

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
  }

  async delete(id: string) {
    const [deleted] = await getDb()
      .delete(stack)
      .where(eq(stack.id, id))
      .returning({ id: stack.id });

    return deleted ?? null;
  }
}

export const stackRepository = new StackRepository();
