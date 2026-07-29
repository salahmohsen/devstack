import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { application } from "./application.schema.ts";
import { user } from "./auth.schema.ts";
import { mailMessage } from "./mail-message.schema.ts";

export const reviewItemKindEnum = pgEnum("review_item_kind", ["reply_draft"]);

export const reviewItemStatusEnum = pgEnum("review_item_status", [
  "pending",
  "confirmed",
  "discarded",
  "sent"
]);

/**
 * Durable confirmation queue row (Assist reply drafts, later other kinds).
 * Tenant-scoped; list defaults to pending.
 */
export const reviewItem = pgTable(
  "review_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: reviewItemKindEnum("kind").notNull().default("reply_draft"),
    status: reviewItemStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull().default(""),
    preview: text("preview").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    bodyHtml: text("body_html"),
    toEmail: text("to_email"),
    subject: text("subject"),
    messageId: text("message_id").references(() => mailMessage.id, {
      onDelete: "set null"
    }),
    applicationId: text("application_id").references(() => application.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (t) => [
    index("review_item_user_id_idx").on(t.userId),
    index("review_item_user_id_status_idx").on(t.userId, t.status),
    index("review_item_message_id_idx").on(t.messageId)
  ]
);

export type ReviewItemKindDb = (typeof reviewItemKindEnum.enumValues)[number];
export type ReviewItemStatusDb = (typeof reviewItemStatusEnum.enumValues)[number];
