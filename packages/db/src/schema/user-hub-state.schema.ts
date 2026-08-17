import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-tenant hub cursor (not Better Auth `user`).
 * `dailyBriefOpenedAt` is the Today letter window cut.
 * `hubChatEpoch` rotates the Mastra memory thread for /new chat.
 */
export const userHubState = pgTable("user_hub_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyBriefOpenedAt: timestamp("daily_brief_opened_at", { withTimezone: true }),
  /** Bumped on “new chat” so hub memory uses a fresh thread id. */
  hubChatEpoch: integer("hub_chat_epoch").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});
