import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { mailCrmApply } from "./mail-crm-apply.schema.ts";
import { mailMessage } from "./mail-message.schema.ts";

/**
 * User correction of AI classify / CRM suggestion.
 * Source of truth for multi-tenant few-shot; not a Mastra dataset row.
 */
export const aiCorrection = pgTable(
  "ai_correction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    messageId: text("message_id").references(() => mailMessage.id, { onDelete: "set null" }),
    fromName: text("from_name").notNull().default(""),
    fromEmail: text("from_email").notNull().default(""),
    subject: text("subject").notNull().default(""),
    preview: text("preview").notNull().default(""),
    /** System labels the model/heuristic produced (empty = none). */
    predictedSystemLabels: text("predicted_system_labels").array().notNull().default([]),
    /** Labels the user said were correct (empty = not career). */
    correctedSystemLabels: text("corrected_system_labels").array().notNull().default([]),
    predictedStage: text("predicted_stage"),
    correctedStage: text("corrected_stage"),
    crmApplyId: text("crm_apply_id").references(() => mailCrmApply.id, {
      onDelete: "set null"
    }),
    /** Copied from message at correction time for Mastra feedback dual-write. */
    mastraTraceId: text("mastra_trace_id"),
    mastraRunId: text("mastra_run_id"),
    /** Optional embedding vector for retrieval few-shot (float array JSON). */
    embedding: jsonb("embedding").$type<number[]>(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("ai_correction_user_id_idx").on(t.userId),
    index("ai_correction_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("ai_correction_message_id_idx").on(t.messageId)
  ]
);
