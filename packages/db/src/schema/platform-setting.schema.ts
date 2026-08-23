import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Singleton platform operator settings (`id = 'default'`).
 * Not tenant-scoped — signup mode applies to the whole install.
 */
export const platformSetting = pgTable("platform_setting", {
  id: text("id").primaryKey(),
  signupMode: text("signup_mode").notNull().default("invite_only"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, {
    onDelete: "set null"
  })
});
