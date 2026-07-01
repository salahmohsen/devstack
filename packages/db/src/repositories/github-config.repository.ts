import { desc, isNotNull, or, sql } from "drizzle-orm";

import { getDb } from "#@/index";
import { githubConfig } from "#@/schema/github-config.schema";

export type UpdateGithubConfigData = {
  githubToken?: string;
  clearGithubToken?: boolean;
  githubUsername: string;
};

export const githubConfigRepository = {
  async findPublicGithubSourceSettings() {
    const [settings] = await getDb()
      .select()
      .from(githubConfig)
      .where(or(isNotNull(githubConfig.githubToken), isNotNull(githubConfig.githubUsername)))
      .orderBy(desc(githubConfig.updatedAt))
      .limit(1);

    return settings ?? null;
  },

  async findByUserId(userId: string) {
    return getDb().query.githubConfig.findFirst({
      where: { userId }
    });
  },

  async upsert(userId: string, input: UpdateGithubConfigData) {
    const existingSettings = await githubConfigRepository.findByUserId(userId);
    const normalizedGithubToken = input.githubToken?.trim() ?? null;

    const githubToken = input.clearGithubToken
      ? null
      : normalizedGithubToken && normalizedGithubToken.length > 0
        ? normalizedGithubToken
        : (existingSettings?.githubToken ?? null);

    if (existingSettings) {
      const [updatedSettings] = await getDb()
        .update(githubConfig)
        .set({
          githubToken,
          githubUsername: input.githubUsername
        })
        .where(sql`${githubConfig.userId} = ${userId}`)
        .returning();

      return updatedSettings;
    }

    const [createdSettings] = await getDb()
      .insert(githubConfig)
      .values({
        githubToken,
        githubUsername: input.githubUsername,
        userId
      })
      .returning();

    return createdSettings;
  }
};
