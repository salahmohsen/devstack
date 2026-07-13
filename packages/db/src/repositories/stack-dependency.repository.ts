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

  async findByNpmPackage(npmPackage: string) {
    return getDb().query.stackDependency.findFirst({
      where: { npmPackage }
    });
  },

  async findManyByNpmPackages(npmPackages: string[]) {
    if (npmPackages.length === 0) return [];
    return getDb().query.stackDependency.findMany({
      where: { npmPackage: { in: npmPackages } }
    });
  },

  async findById(id: string) {
    return getDb().query.stackDependency.findFirst({ where: { id } });
  },

  async upsert(input: CreateStackDependencyData) {
    const existing = await getDb().query.stackDependency.findFirst({
      where: { stackId: input.stackId, npmPackage: input.npmPackage }
    });

    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    await getDb()
      .insert(stackDependency)
      .values({ id, ...input });
    return this.findById(id);
  },

  async create(input: CreateStackDependencyData) {
    const id = crypto.randomUUID();
    await getDb()
      .insert(stackDependency)
      .values({ id, ...input });
    return this.findById(id);
  },

  async createMany(inputs: CreateStackDependencyData[]) {
    if (inputs.length === 0) return [];
    const ids = inputs.map(() => crypto.randomUUID());

    await getDb().transaction(async (tx) => {
      for (let i = 0; i < inputs.length; i++) {
        await tx.insert(stackDependency).values({
          id: ids[i],
          ...inputs[i]
        });
      }
    });

    return getDb().query.stackDependency.findMany({
      where: { id: { in: ids } }
    });
  },

  async deleteByStackId(stackId: string) {
    return getDb().delete(stackDependency).where(eq(stackDependency.stackId, stackId));
  }
};
