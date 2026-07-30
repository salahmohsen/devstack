import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  userNotificationSettings,
  type StoredNotificationChannels
} from "../schema/user-notification-settings.schema.ts";

export type UserNotificationSettingsEntity = InferSelectModel<typeof userNotificationSettings>;

export type UpsertUserNotificationSettingsInput = {
  id: string;
  userId: string;
  notificationEmail: string | null;
  channels: StoredNotificationChannels;
  emailDeliveryMode?: "immediate" | "digest";
  lastDigestAt?: Date | null;
};

export const userNotificationSettingsRepository = {
  async findByUserId(userId: string): Promise<UserNotificationSettingsEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async listDigestModeUserIds(): Promise<string[]> {
    const rows = await getDb()
      .select({ userId: userNotificationSettings.userId })
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.emailDeliveryMode, "digest"));
    return rows.map((r) => r.userId);
  },

  async upsert(
    input: UpsertUserNotificationSettingsInput
  ): Promise<UserNotificationSettingsEntity> {
    const db = getDb();
    const existing = await this.findByUserId(input.userId);

    if (existing) {
      const [row] = await db
        .update(userNotificationSettings)
        .set({
          notificationEmail: input.notificationEmail,
          channels: input.channels,
          emailDeliveryMode: input.emailDeliveryMode ?? existing.emailDeliveryMode,
          lastDigestAt:
            input.lastDigestAt !== undefined ? input.lastDigestAt : existing.lastDigestAt,
          updatedAt: new Date()
        })
        .where(eq(userNotificationSettings.userId, input.userId))
        .returning();
      if (!row) throw new Error("Failed to update user_notification_settings");
      return row;
    }

    const [row] = await db
      .insert(userNotificationSettings)
      .values({
        id: input.id,
        userId: input.userId,
        notificationEmail: input.notificationEmail,
        channels: input.channels,
        emailDeliveryMode: input.emailDeliveryMode ?? "immediate",
        lastDigestAt: input.lastDigestAt ?? null
      })
      .returning();
    if (!row) throw new Error("Failed to insert user_notification_settings");
    return row;
  },

  async markDigestSent(userId: string, at = new Date()): Promise<void> {
    await getDb()
      .update(userNotificationSettings)
      .set({ lastDigestAt: at, updatedAt: at })
      .where(eq(userNotificationSettings.userId, userId));
  }
};
