import { contact } from "../schema/index.ts";

const contactSchemaInsert = contact.$inferInsert;
const contactSchemaSelect = contact.$inferSelect;
export type ContactSchemaInsert = typeof contactSchemaInsert;
export type ContactSchemaSelect = typeof contactSchemaSelect;
