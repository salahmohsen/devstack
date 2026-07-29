import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type userMailSettings } from "../schema/user-mail-settings.schema.ts";

export type UserMailSettingsSchemaSelect = InferSelectModel<typeof userMailSettings>;
export type UserMailSettingsSchemaInsert = InferInsertModel<typeof userMailSettings>;
