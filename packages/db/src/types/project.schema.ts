import { project, projectStack } from "#@/schema/index";

const projectSchemaInsert = project.$inferInsert;
const projectSchemaSelect = project.$inferSelect;
export type ProjectSchemaInsert = typeof projectSchemaInsert;
export type ProjectSchemaSelect = typeof projectSchemaSelect;

const projectStackSchemaInsert = projectStack.$inferInsert;
const projectStackSchemaSelect = projectStack.$inferSelect;
export type ProjectStackSchemaInsert = typeof projectStackSchemaInsert;
export type ProjectStackSchemaSelect = typeof projectStackSchemaSelect;
