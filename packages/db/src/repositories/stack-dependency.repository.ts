import { and, eq, ne, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { stackDependency } from "../schema/stack-dependency.schema.ts";

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

  async findByStackIds(stackIds: string[]): Promise<StackDependencyEntity[]> {
    if (stackIds.length === 0) return [];
    return getDb().query.stackDependency.findMany({
      where: { stackId: { in: stackIds } }
    });
  },

  async findByNpmPackage(npmPackage: string): Promise<StackDependencyEntity | undefined> {
    return getDb().query.stackDependency.findFirst({
      where: { npmPackage }
    });
  },

  async upsert(input: CreateStackDependencyData): Promise<StackDependencyEntity | undefined> {
    const id = crypto.randomUUID();
    await getDb()
      .insert(stackDependency)
      .values({ id, ...input })
      .onConflictDoNothing({
        target: stackDependency.npmPackage
      });
    return getDb().query.stackDependency.findFirst({
      where: { npmPackage: input.npmPackage }
    });
  },

  async findAll(): Promise<StackDependencyEntity[]> {
    return getDb().query.stackDependency.findMany();
  },

  async deleteByStackId(stackId: string) {
    return getDb().delete(stackDependency).where(eq(stackDependency.stackId, stackId));
  },

  async deleteByNpmPackage(stackId: string, npmPackage: string) {
    return getDb()
      .delete(stackDependency)
      .where(and(eq(stackDependency.stackId, stackId), eq(stackDependency.npmPackage, npmPackage)));
  },

  async reassign(
    stackId: string,
    npmPackage: string,
    description?: string | null,
    homepage?: string | null
  ): Promise<StackDependencyEntity | undefined> {
    await getDb()
      .delete(stackDependency)
      .where(and(eq(stackDependency.npmPackage, npmPackage), ne(stackDependency.stackId, stackId)));
    return this.upsert({
      stackId,
      npmPackage,
      description: description ?? null,
      homepage: homepage ?? null,
      lastRefreshedAt: null
    });
  },

  async syncForStack(
    stackId: string,
    dependencies: Array<{
      npmPackage: string;
      description?: string | null;
      homepage?: string | null;
    }>
  ) {
    return getDb().transaction(async (tx) => {
      await tx.delete(stackDependency).where(eq(stackDependency.stackId, stackId));

      if (dependencies.length > 0) {
        await tx.insert(stackDependency).values(
          dependencies.map((dep) => {
            return {
              id: crypto.randomUUID(),
              stackId,
              npmPackage: dep.npmPackage,
              description: dep.description ?? null,
              homepage: dep.homepage ?? null,
              lastRefreshedAt: null
            };
          })
        );
      }
    });
  }
};
