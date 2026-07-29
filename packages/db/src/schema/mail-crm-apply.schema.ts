import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { application } from "./application.schema.ts";
import { user } from "./auth.schema.ts";
import { mailMessage } from "./mail-message.schema.ts";

/**
 * Audit row for full-auto CRM effects applied from Career Inbox classify.
 * `before` / `after` are JSON snapshots (MailCrmAuditSnapshot shape from core).
 * Undo restores `before` and sets `undoneAt`.
 */
export const mailCrmApply = pgTable(
  "mail_crm_apply",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => mailMessage.id, { onDelete: "cascade" }),
    applicationId: text("application_id").references(() => application.id, {
      onDelete: "set null"
    }),
    /** Machine kind: noop | link_only | advance_stage | set_outcome */
    effectKind: text("effect_kind").notNull(),
    reason: text("reason").notNull().default(""),
    before: jsonb("before").$type<Record<string, unknown>>().notNull(),
    after: jsonb("after").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    undoneAt: timestamp("undone_at", { withTimezone: true })
  },
  (t) => [
    index("mail_crm_apply_user_id_idx").on(t.userId),
    index("mail_crm_apply_message_id_idx").on(t.messageId),
    // At most one active apply per message; undo allows a later re-apply row.
    uniqueIndex("mail_crm_apply_message_active_uidx")
      .on(t.messageId)
      .where(sql`${t.undoneAt} is null`)
  ]
);
