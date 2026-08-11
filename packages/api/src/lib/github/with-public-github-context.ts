import { ORPCError } from "@orpc/server";

import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import { resolvePublicGitHubSourceForUser } from "@tsu-stack/github/shared/public-github-source";

import { type OrpcContext } from "#@/lib/context/types";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";

/**
 * Resolve the portfolio user (path username and/or Host custom domain),
 * then inject that tenant's GitHub OAuth source into a request-local context.
 */
export async function withPublicGitHubContext<T>(
  context: OrpcContext,
  input: { username?: string | null },
  run: (scoped: OrpcContext) => Promise<T>
): Promise<T> {
  const resolved = await resolvePublicPortfolioContext({
    host: context.host,
    pathUsername: input.username
  });

  if (!resolved) {
    throw new ORPCError("NOT_FOUND", { message: "Profile not found" });
  }

  const source = await resolvePublicGitHubSourceForUser(resolved.userId);
  if (!source.isConfigured) {
    throw new ORPCError("NOT_FOUND", { message: "GitHub is not linked for this profile" });
  }

  const scoped: OrpcContext = {
    ...context,
    github: {
      ...context.github,
      source,
      publicOctokit: createGitHubOctokit(source)
    }
  };

  return run(scoped);
}

export async function getPublicGitHubSetupStatus(
  context: OrpcContext,
  input: { username?: string | null }
): Promise<{ isConfigured: boolean; owner: string | null }> {
  const resolved = await resolvePublicPortfolioContext({
    host: context.host,
    pathUsername: input.username
  });

  if (!resolved) {
    return { isConfigured: false, owner: null };
  }

  const source = await resolvePublicGitHubSourceForUser(resolved.userId);
  return {
    isConfigured: source.isConfigured,
    owner: source.isConfigured ? source.owner : null
  };
}
