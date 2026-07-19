import { stack } from "../schema/index.ts";

const stackSchemaInsert = stack.$inferInsert;
const stackSchemaSelect = stack.$inferSelect;

export type StackSchemaInsert = typeof stackSchemaInsert;
export type StackSchemaSelect = typeof stackSchemaSelect;

export type StackEntity = StackSchemaSelect;
export type CreateStackData = Omit<StackSchemaInsert, "id" | "createdAt" | "updatedAt">;
export type UpdateStackData = Partial<CreateStackData>;
export type ReorderStackItem = { id: string; sortOrder: number };
