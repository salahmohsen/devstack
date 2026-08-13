import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  userAiSettings,
  type StoredAiModelProviderIds,
  type StoredAiModels,
  type StoredAiProvider
} from "../schema/user-ai-settings.schema.ts";

export type UserAiSettingsEntity = InferSelectModel<typeof userAiSettings>;

export type UpsertUserAiSettingsInput = {
  id: string;
  userId: string;
  providers: StoredAiProvider[];
  models: StoredAiModels;
  /** Omit to keep existing bindings (update) or default `{}` (insert). */
  modelProviderIds?: StoredAiModelProviderIds;
};

export const userAiSettingsRepository = {
  async findByUserId(userId: string): Promise<UserAiSettingsEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async upsert(input: UpsertUserAiSettingsInput): Promise<UserAiSettingsEntity> {
    const db = getDb();
    const existing = await this.findByUserId(input.userId);
    const modelProviderIds =
      input.modelProviderIds ?? existing?.modelProviderIds ?? ({} as StoredAiModelProviderIds);

    if (existing) {
      const [row] = await db
        .update(userAiSettings)
        .set({
          providers: input.providers,
          models: input.models,
          modelProviderIds,
          updatedAt: new Date()
        })
        .where(eq(userAiSettings.userId, input.userId))
        .returning();
      if (!row) throw new Error("Failed to update user_ai_settings");
      return row;
    }

    const [row] = await db
      .insert(userAiSettings)
      .values({
        id: input.id,
        userId: input.userId,
        providers: input.providers,
        models: input.models,
        modelProviderIds
      })
      .returning();
    if (!row) throw new Error("Failed to insert user_ai_settings");
    return row;
  }
};
