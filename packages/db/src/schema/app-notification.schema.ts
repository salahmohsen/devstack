import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { application } from "./application.schema.ts";
import { user } from "./auth.schema.ts";
import { mailMessage } from "./mail-message.schema.ts";
import { reviewItem } from "./review-item.schema.ts";

/**
 * In-app notification row (bell). Email channel is separate (system mail later).
 * `kind` matches NotificationKind string literals from core.
 */
export const appNotification = pgTable(
  "app_notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    messageId: text("message_id").references(() => mailMessage.id, {
      onDelete: "set null"
    }),
    applicationId: text("application_id").references(() => application.id, {
      onDelete: "set null"
    }),
    reviewItemId: text("review_item_id").references(() => reviewItem.id, {
      onDelete: "set null"
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("app_notification_user_id_idx").on(t.userId),
    index("app_notification_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("app_notification_user_id_read_at_idx").on(t.userId, t.readAt)
  ]
);
