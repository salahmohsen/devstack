import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type mailSmartRule } from "../schema/mail-smart-rule.schema.ts";

export type MailSmartRuleSchemaSelect = InferSelectModel<typeof mailSmartRule>;
export type MailSmartRuleSchemaInsert = InferInsertModel<typeof mailSmartRule>;
