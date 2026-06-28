import { and, eq } from "drizzle-orm";

import { getDb } from "#@/index";
import { account } from "#@/schema/auth.schema";

class BetterAuthAccountRepository {
  /**
   * Look up the GitHub OAuth access token for a signed-in user.
   *
   * Better Auth persists the token the user just signed in with on
   * the `account` row keyed by `providerId = "github"`. Reading it
   * here means the per-request `privateOctokit` is built with the
   * scopes the user actually granted (including `repo`) instead of
   * whatever's stored in the static `github_config` PAT.
   */
  async findGitHubAccessTokenForUser(userId: string): Promise<string | null> {
    const rows = await getDb()
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
      .limit(1);

    return rows[0]?.accessToken ?? null;
  }
}

export const betterAuthAccountRepository = new BetterAuthAccountRepository();
