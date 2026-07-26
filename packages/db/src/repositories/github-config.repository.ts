import { desc, isNotNull, sql } from "drizzle-orm";

import { getDb } from "../index.ts";
import { githubConfig } from "../schema/github-config.schema.ts";

/**
 * Portfolio-owner identity for GitHub public routes.
 * Tokens live on Better Auth `account` (OAuth) — not on this table.
 */
export const githubConfigRepository = {
  async findPublicGithubSourceSettings() {
    const [settings] = await getDb()
      .select()
      .from(githubConfig)
      .where(isNotNull(githubConfig.githubUsername))
      .orderBy(desc(githubConfig.updatedAt))
      .limit(1);

    if (settings) return settings;

    // Fall back to any row (owner may only have userId until username is synced).
    const [anyRow] = await getDb()
      .select()
      .from(githubConfig)
      .orderBy(desc(githubConfig.updatedAt))
      .limit(1);

    return anyRow ?? null;
  },

  async findByUserId(userId: string) {
    return getDb().query.githubConfig.findFirst({
      where: { userId }
    });
  },

  /** Upsert username only — never store classic PATs. */
  async upsertUsername(userId: string, githubUsername: string) {
    const existing = await githubConfigRepository.findByUserId(userId);
    const name = githubUsername.trim();
    if (!name) return existing ?? null;

    if (existing) {
      const [updated] = await getDb()
        .update(githubConfig)
        .set({
          githubUsername: name,
          // Clear legacy PAT if present — OAuth is the only source of truth.
          githubToken: null
        })
        .where(sql`${githubConfig.userId} = ${userId}`)
        .returning();
      return updated;
    }

    const [created] = await getDb()
      .insert(githubConfig)
      .values({
        userId,
        githubUsername: name,
        githubToken: null
      })
      .returning();
    return created;
  }
};
