import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { stackDependency } from "#@/schema/stack-dependency.schema";

export type StackDependencyEntity = InferSelectModel<typeof stackDependency>;
export type CreateStackDependencyData = Omit<
  InferInsertModel<typeof stackDependency>,
  "id" | "createdAt" | "updatedAt"
>;

export const stackDependencyRepository = {
  async findByStackId(stackId: string): Promise<StackDependencyEntity[]> {
    return getDb().query.stackDependency.findMany({
      where: { stackId }
    });
  },

  async upsert(input: CreateStackDependencyData): Promise<StackDependencyEntity | undefined> {
    const id = crypto.randomUUID();
    await getDb()
      .insert(stackDependency)
      .values({ id, ...input })
      .onConflictDoNothing({
        target: [stackDependency.stackId, stackDependency.npmPackage]
      });
    return getDb().query.stackDependency.findFirst({
      where: { stackId: input.stackId, npmPackage: input.npmPackage }
    });
  },

  async findAll(): Promise<StackDependencyEntity[]> {
    return getDb().query.stackDependency.findMany();
  },

  async deleteByStackId(stackId: string) {
    return getDb().delete(stackDependency).where(eq(stackDependency.stackId, stackId));
  }
};
