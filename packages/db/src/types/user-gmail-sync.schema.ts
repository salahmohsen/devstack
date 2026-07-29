import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type userGmailSync } from "../schema/user-gmail-sync.schema.ts";

export type UserGmailSyncSchemaSelect = InferSelectModel<typeof userGmailSync>;
export type UserGmailSyncSchemaInsert = InferInsertModel<typeof userGmailSync>;
