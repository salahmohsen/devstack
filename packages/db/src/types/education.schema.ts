import { education } from "../schema/index.ts";

const educationSchemaInsert = education.$inferInsert;
const educationSchemaSelect = education.$inferSelect;
export type EducationSchemaInsert = typeof educationSchemaInsert;
export type EducationSchemaSelect = typeof educationSchemaSelect;
