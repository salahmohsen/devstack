import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-user Gmail History API cursor for Career Inbox sync.
 * historyId is the Gmail mailbox history watermark (stringified number).
 */
export const userGmailSync = pgTable(
  "user_gmail_sync",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Gmail users.getProfile historyId after last successful sync. */
    historyId: text("history_id"),
    /** Gmail address from profile (display only). */
    emailAddress: text("email_address"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [uniqueIndex("user_gmail_sync_user_id_unique_idx").on(t.userId)]
);
