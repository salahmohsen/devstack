import { eq } from "drizzle-orm";

import { getDb } from "../index.ts";
import { platformSetting } from "../schema/platform-setting.schema.ts";

export const PLATFORM_SETTING_ID = "default";

export type PlatformSettingEntity = {
  id: string;
  signupMode: string;
  updatedAt: Date;
  updatedByUserId: string | null;
};

export const platformSettingRepository = {
  async get(): Promise<PlatformSettingEntity> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(platformSetting)
      .where(eq(platformSetting.id, PLATFORM_SETTING_ID))
      .limit(1);

    if (row) return row;

    const [created] = await db
      .insert(platformSetting)
      .values({
        id: PLATFORM_SETTING_ID,
        signupMode: "invite_only"
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    const [again] = await db
      .select()
      .from(platformSetting)
      .where(eq(platformSetting.id, PLATFORM_SETTING_ID))
      .limit(1);
    if (!again) {
      throw new Error("Failed to load platform settings");
    }
    return again;
  },

  async setSignupMode(signupMode: "invite_only" | "open", updatedByUserId: string) {
    const db = getDb();
    await platformSettingRepository.get();
    const [updated] = await db
      .update(platformSetting)
      .set({
        signupMode,
        updatedByUserId,
        updatedAt: new Date()
      })
      .where(eq(platformSetting.id, PLATFORM_SETTING_ID))
      .returning();

    if (!updated) {
      throw new Error("Failed to update signup mode");
    }
    return updated;
  }
};
