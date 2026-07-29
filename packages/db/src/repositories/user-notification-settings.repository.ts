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
        channels: input.channels
      })
      .returning();
    if (!row) throw new Error("Failed to insert user_notification_settings");
    return row;
  }
};
