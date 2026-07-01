import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "#@/schema/auth.schema";

/**
 * Per-user public contact info (website, email, location).
 *
 * One row per user. The `userId` column is the primary key and a
 * foreign key to `user.id` (cascade delete). The fields are
 * deliberately nullable so a fresh user has a "blank" contact
 * rather than empty strings; the public site renders a missing
 * row as "not set".
 */
export const contact = pgTable("contact", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  website: text("website"),
  email: text("email"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});
