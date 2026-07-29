import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * User-defined Career Inbox category (smart rule).
 * Messages get label `rule:{slug}` when keywords match during classify.
 */
export const mailSmartRule = pgTable(
  "mail_smart_rule",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("sparkles"),
    keywords: text("keywords").array().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex("mail_smart_rule_user_id_slug_uidx").on(t.userId, t.slug),
    index("mail_smart_rule_user_id_idx").on(t.userId)
  ]
);
