import { jobPreference } from "../schema/index.ts";

const jobPreferenceSchemaInsert = jobPreference.$inferInsert;
const jobPreferenceSchemaSelect = jobPreference.$inferSelect;
export type JobPreferenceSchemaInsert = typeof jobPreferenceSchemaInsert;
export type JobPreferenceSchemaSelect = typeof jobPreferenceSchemaSelect;
