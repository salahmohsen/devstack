import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/** Former public usernames that redirect to the same user after rename. */
export const usernameSlugAlias = pgTable(
  "username_slug_alias",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("username_slug_alias_slug_unique_idx").on(t.slug)]
);
