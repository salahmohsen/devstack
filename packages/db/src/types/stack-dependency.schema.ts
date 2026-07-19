import { stackDependency } from "../schema/index.ts";

const stackDependencySchemaInsert = stackDependency.$inferInsert;
const stackDependencySchemaSelect = stackDependency.$inferSelect;

export type StackDependencySchemaInsert = typeof stackDependencySchemaInsert;
export type StackDependencySchemaSelect = typeof stackDependencySchemaSelect;
