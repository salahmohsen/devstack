import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export type StoredNotificationChannelToggle = {
  app: boolean;
  email: boolean;
};

export type StoredNotificationChannels = {
  "mail.reply.draft_ready": StoredNotificationChannelToggle;
  "mail.classified.important": StoredNotificationChannelToggle;
  "application.stage_auto": StoredNotificationChannelToggle;
  "workflow.finished": StoredNotificationChannelToggle;
  "security.new_device_otp": StoredNotificationChannelToggle;
};

/**
 * Per-user notification preferences + destination email for system mail.
 * Reply auto-send is NOT stored here (AI settings only).
 */
export const userNotificationSettings = pgTable(
  "user_notification_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Destination for system notification emails; null → fall back to account email. */
    notificationEmail: text("notification_email"),
    channels: jsonb("channels").$type<StoredNotificationChannels>().notNull(),
    /**
     * immediate — email each event; digest — batch non-security emails hourly.
     * Stored as text; validated in core (`EmailDeliveryModeSchema`).
     */
    emailDeliveryMode: text("email_delivery_mode").notNull().default("immediate"),
    lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [uniqueIndex("user_notification_settings_user_id_unique_idx").on(t.userId)]
);
