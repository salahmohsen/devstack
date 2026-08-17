import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-tenant hub cursor (not Better Auth `user`).
 * `dailyBriefOpenedAt` is the Today letter window cut.
 */
export const userHubState = pgTable("user_hub_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyBriefOpenedAt: timestamp("daily_brief_opened_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});
