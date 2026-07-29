import { userNotificationSettings } from "../schema/index.ts";

const userNotificationSettingsSchemaInsert = userNotificationSettings.$inferInsert;
const userNotificationSettingsSchemaSelect = userNotificationSettings.$inferSelect;
export type UserNotificationSettingsSchemaInsert = typeof userNotificationSettingsSchemaInsert;
export type UserNotificationSettingsSchemaSelect = typeof userNotificationSettingsSchemaSelect;
