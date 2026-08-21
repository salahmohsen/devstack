import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { application } from "./application.schema.ts";
import { user } from "./auth.schema.ts";

/** Product purpose — system_notification hidden from default Career Inbox lists. */
export const mailPurposeEnum = pgEnum("mail_purpose", ["career", "system_notification"]);

/** Ingress source for debugging + idempotency key namespace. */
export const mailProviderEnum = pgEnum("mail_provider", ["resend", "gmail", "manual"]);

/**
 * Tenant-scoped Career Inbox message.
 * Labels: system career set (application|recruiter|interview|offer) + smart-rule `rule:{slug}`.
 */
export const mailMessage = pgTable(
  "mail_message",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: mailProviderEnum("provider").notNull().default("manual"),
    /** External delivery / message id for idempotent ingress (unique per user + provider). */
    providerMessageId: text("provider_message_id"),
    fromName: text("from_name").notNull().default(""),
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email"),
    subject: text("subject").notNull().default(""),
    preview: text("preview").notNull().default(""),
    /** Neutral one-liner from classify (who + ask). Today reads this, not the body. */
    summary: text("summary"),
    bodyText: text("body_text").notNull().default(""),
    bodyHtml: text("body_html"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    unread: boolean("unread").notNull().default(true),
    purpose: mailPurposeEnum("purpose").notNull().default("career"),
    /** System career labels + smart-rule labels (`rule:…`). */
    labels: text("labels").array().notNull().default([]),
    applicationId: text("application_id").references(() => application.id, {
      onDelete: "set null"
    }),
    classifiedAt: timestamp("classified_at", { withTimezone: true }),
    /** Mastra workflow run id from mail-classify (for feedback anchoring). */
    mastraClassifyRunId: text("mastra_classify_run_id"),
    /** Observability trace id when agent path produced one. */
    mastraClassifyTraceId: text("mastra_classify_trace_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("mail_message_user_id_idx").on(table.userId),
    index("mail_message_user_id_received_at_idx").on(table.userId, table.receivedAt),
    index("mail_message_user_id_purpose_idx").on(table.userId, table.purpose),
    index("mail_message_application_id_idx").on(table.applicationId),
    // Partial unique: only when provider_message_id is set (manual rows may omit it).
    uniqueIndex("mail_message_user_provider_msg_uidx")
      .on(table.userId, table.provider, table.providerMessageId)
      .where(sql`provider_message_id is not null`)
  ]
);

/**
 * Attachment metadata only — bytes live in object storage (see media-storage patterns).
 */
export const mailAttachment = pgTable(
  "mail_attachment",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => mailMessage.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    storageKey: text("storage_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("mail_attachment_message_id_idx").on(table.messageId),
    index("mail_attachment_user_id_idx").on(table.userId)
  ]
);

export type MailPurposeDb = (typeof mailPurposeEnum.enumValues)[number];
export type MailProviderDb = (typeof mailProviderEnum.enumValues)[number];
