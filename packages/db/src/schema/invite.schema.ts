import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const invite = pgTable(
  "invite",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null"
    }),
    usedByUserId: text("used_by_user_id").references(() => user.id, {
      onDelete: "set null"
    }),
    /** When set, this invite was emailed to this address. */
    email: text("email"),
    /** Null = unlimited until revoked. Email invites are 1. */
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("invite_code_unique_idx").on(t.code)]
);
