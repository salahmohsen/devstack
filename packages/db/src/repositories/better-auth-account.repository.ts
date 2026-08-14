import { and, eq } from "drizzle-orm";

import { getDb } from "../index.ts";
import { account } from "../schema/auth.schema.ts";

export type GitHubAccountTokens = {
  id: string;
  userId: string;
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  updatedAt: Date;
};

export const betterAuthAccountRepository = {
  /**
   * Look up the GitHub OAuth access token for a signed-in user.
   *
   * Better Auth persists the token the user just signed in with on
   * the `account` row keyed by `providerId = "github"`.
   */
  async findGitHubAccessTokenForUser(userId: string): Promise<string | null> {
    const row = await this.findGitHubAccountForUser(userId);
    return row?.accessToken ?? null;
  },

  /**
   * Read the `scope` column on the user's GitHub account row.
   */
  async findGithubScopesForUser(userId: string): Promise<string | null> {
    const row = await this.findGitHubAccountForUser(userId);
    return row?.scope ?? null;
  },

  async findGitHubAccountForUser(userId: string): Promise<GitHubAccountTokens | null> {
    return this.findProviderAccountForUser(userId, "github");
  },

  async findGoogleAccountForUser(userId: string): Promise<GitHubAccountTokens | null> {
    return this.findProviderAccountForUser(userId, "google");
  },

  async findProviderAccountForUser(
    userId: string,
    providerId: string
  ): Promise<GitHubAccountTokens | null> {
    const rows = await getDb()
      .select({
        id: account.id,
        userId: account.userId,
        accountId: account.accountId,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
        refreshTokenExpiresAt: account.refreshTokenExpiresAt,
        scope: account.scope,
        updatedAt: account.updatedAt
      })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
      .limit(1);

    return rows[0] ?? null;
  },

  async updateGitHubTokens(
    accountRowId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string | null;
      accessTokenExpiresAt?: Date | null;
      refreshTokenExpiresAt?: Date | null;
      scope?: string | null;
    }
  ) {
    return this.updateProviderTokens(accountRowId, tokens);
  },

  async updateProviderTokens(
    accountRowId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string | null;
      accessTokenExpiresAt?: Date | null;
      refreshTokenExpiresAt?: Date | null;
      scope?: string | null;
    }
  ) {
    await getDb()
      .update(account)
      .set({
        accessToken: tokens.accessToken,
        ...(tokens.refreshToken !== undefined ? { refreshToken: tokens.refreshToken } : {}),
        ...(tokens.accessTokenExpiresAt !== undefined
          ? { accessTokenExpiresAt: tokens.accessTokenExpiresAt }
          : {}),
        ...(tokens.refreshTokenExpiresAt !== undefined
          ? { refreshTokenExpiresAt: tokens.refreshTokenExpiresAt }
          : {}),
        ...(tokens.scope !== undefined ? { scope: tokens.scope } : {}),
        updatedAt: new Date()
      })
      .where(eq(account.id, accountRowId));
  }
};
