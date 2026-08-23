import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type platformSetting } from "../schema/platform-setting.schema.ts";

export type PlatformSettingSchemaSelect = InferSelectModel<typeof platformSetting>;
export type PlatformSettingSchemaInsert = InferInsertModel<typeof platformSetting>;
