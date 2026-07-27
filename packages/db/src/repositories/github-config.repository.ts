import { sql } from "drizzle-orm";

import { getDb } from "../index.ts";
import { githubConfig } from "../schema/github-config.schema.ts";

/**
 * Per-tenant GitHub display config (`userId` + username).
 * Tokens live on Better Auth `account` (OAuth) for that user — not here.
 * Do not add global “first row” lookups; always scope by `userId`.
 */
export const githubConfigRepository = {
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
