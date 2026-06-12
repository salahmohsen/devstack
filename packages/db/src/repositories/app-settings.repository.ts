import { desc, isNotNull, or, sql } from "drizzle-orm";

import { db } from "#@/index";
import { appSettings } from "#@/schema/app-settings.schema";

export type UpdateAppSettingsData = {
  githubToken?: string;
  clearGithubToken?: boolean;
  githubUsername: string;
};

class AppSettingsRepository {
  async findPublicGithubSourceSettings() {
    const [settings] = await db
      .select()
      .from(appSettings)
      .where(or(isNotNull(appSettings.githubToken), isNotNull(appSettings.githubUsername)))
      .orderBy(desc(appSettings.updatedAt))
      .limit(1);

    return settings ?? null;
  }

  async findByUserId(userId: string) {
    return db.query.appSettings.findFirst({
      where: { userId }
    });
  }

  async upsert(userId: string, input: UpdateAppSettingsData) {
    const existingSettings = await this.findByUserId(userId);
    const normalizedGithubToken = input.githubToken?.trim() ?? null;

    const githubToken = input.clearGithubToken
      ? null
      : normalizedGithubToken && normalizedGithubToken.length > 0
        ? normalizedGithubToken
        : (existingSettings?.githubToken ?? null);

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(appSettings)
        .set({
          githubToken,
          githubUsername: input.githubUsername
        })
        .where(sql`${appSettings.userId} = ${userId}`)
        .returning();

      return updatedSettings;
    }

    const [createdSettings] = await db
      .insert(appSettings)
      .values({
        githubToken,
        githubUsername: input.githubUsername,
        userId
      })
      .returning();

    return createdSettings;
  }
}

export const appSettingsRepository = new AppSettingsRepository();
