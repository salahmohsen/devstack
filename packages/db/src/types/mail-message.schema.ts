import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type mailAttachment, type mailMessage } from "../schema/mail-message.schema.ts";

export type MailMessageSchemaSelect = InferSelectModel<typeof mailMessage>;
export type MailMessageSchemaInsert = InferInsertModel<typeof mailMessage>;
export type MailAttachmentSchemaSelect = InferSelectModel<typeof mailAttachment>;
export type MailAttachmentSchemaInsert = InferInsertModel<typeof mailAttachment>;
