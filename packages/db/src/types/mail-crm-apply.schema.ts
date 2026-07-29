import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type mailCrmApply } from "../schema/mail-crm-apply.schema.ts";

export type MailCrmApplySchemaSelect = InferSelectModel<typeof mailCrmApply>;
export type MailCrmApplySchemaInsert = InferInsertModel<typeof mailCrmApply>;
