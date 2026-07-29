import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type appNotification } from "../schema/app-notification.schema.ts";

export type AppNotificationSchemaSelect = InferSelectModel<typeof appNotification>;
export type AppNotificationSchemaInsert = InferInsertModel<typeof appNotification>;
