import { stack } from "#@/schema/index";

const stackSchemaInsert = stack.$inferInsert;
const stackSchemaSelect = stack.$inferSelect;

export type StackSchemaInsert = typeof stackSchemaInsert;
export type StackSchemaSelect = typeof stackSchemaSelect;
