import { userAiSettings } from "../schema/index.ts";

const userAiSettingsSchemaInsert = userAiSettings.$inferInsert;
const userAiSettingsSchemaSelect = userAiSettings.$inferSelect;
export type UserAiSettingsSchemaInsert = typeof userAiSettingsSchemaInsert;
export type UserAiSettingsSchemaSelect = typeof userAiSettingsSchemaSelect;
