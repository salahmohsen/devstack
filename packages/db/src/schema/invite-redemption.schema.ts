import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { invite } from "./invite.schema.ts";

/** One row per user who signed up with an invite. Unique user_id = one attribution. */
export const inviteRedemption = pgTable(
  "invite_redemption",
  {
    id: text("id").primaryKey(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => invite.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("invite_redemption_invite_user_unique_idx").on(t.inviteId, t.userId),
    uniqueIndex("invite_redemption_user_id_unique_idx").on(t.userId)
  ]
);
