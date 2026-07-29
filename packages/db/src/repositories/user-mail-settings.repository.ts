import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userMailSettings } from "../schema/user-mail-settings.schema.ts";

export type UserMailSettingsEntity = InferSelectModel<typeof userMailSettings>;

export type UpsertUserMailSettingsInput = {
  id: string;
  userId: string;
  inboundEnabled: boolean;
  inboundAddress: string | null;
  resendApiKeyLast4: string | null;
  resendApiKeyCiphertext: string | null;
  webhookSecretLast4: string | null;
  webhookSecretCiphertext: string | null;
  webhookToken: string;
};

export const userMailSettingsRepository = {
  async findByUserId(userId: string): Promise<UserMailSettingsEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userMailSettings)
      .where(eq(userMailSettings.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async findByWebhookToken(webhookToken: string): Promise<UserMailSettingsEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userMailSettings)
      .where(eq(userMailSettings.webhookToken, webhookToken))
      .limit(1);
    return row ?? null;
  },

  async upsert(input: UpsertUserMailSettingsInput): Promise<UserMailSettingsEntity> {
    const db = getDb();
    const existing = await this.findByUserId(input.userId);

    if (existing) {
      const [row] = await db
        .update(userMailSettings)
        .set({
          inboundEnabled: input.inboundEnabled,
          inboundAddress: input.inboundAddress,
          resendApiKeyLast4: input.resendApiKeyLast4,
          resendApiKeyCiphertext: input.resendApiKeyCiphertext,
          webhookSecretLast4: input.webhookSecretLast4,
          webhookSecretCiphertext: input.webhookSecretCiphertext,
          webhookToken: input.webhookToken,
          updatedAt: new Date()
        })
        .where(eq(userMailSettings.userId, input.userId))
        .returning();
      if (!row) throw new Error("Failed to update user_mail_settings");
      return row;
    }

    const [row] = await db
      .insert(userMailSettings)
      .values({
        id: input.id,
        userId: input.userId,
        inboundEnabled: input.inboundEnabled,
        inboundAddress: input.inboundAddress,
        resendApiKeyLast4: input.resendApiKeyLast4,
        resendApiKeyCiphertext: input.resendApiKeyCiphertext,
        webhookSecretLast4: input.webhookSecretLast4,
        webhookSecretCiphertext: input.webhookSecretCiphertext,
        webhookToken: input.webhookToken
      })
      .returning();
    if (!row) throw new Error("Failed to insert user_mail_settings");
    return row;
  }
};
