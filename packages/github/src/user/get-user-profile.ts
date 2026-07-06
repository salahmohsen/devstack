import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubUserProfile } from "#@/types";

async function _fetchUserProfile(
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubUserProfile | null> {
  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_user_profile_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const ownerProfileKey = githubRevalidationSignalKeys.ownerProfile(source.owner);

  try {
    const result = await getCachedGitHubRequest<GitHubUserProfile>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.users.getByUsername({
          headers: buildGitHubConditionalHeaders(conditionals),
          username: source.owner
        });
        const user = response.data;

        return {
          data: {
            avatarUrl: user.avatar_url,
            bio: user.bio ?? null,
            blog: user.blog ?? null,
            company: user.company ?? null,
            createdAt: user.created_at,
            followers: user.followers ?? 0,
            following: user.following ?? 0,
            id: user.id,
            location: user.location ?? null,
            login: user.login,
            name: user.name ?? null,
            publicRepos: user.public_repos ?? 0,
            twitterUsername: user.twitter_username ?? null,
            url: user.html_url
          },
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.mine.staleTimeMs,
      namespaceKeys: [ownerProfileKey],
      owner: source.owner,
      params: { username: source.owner },
      resource: "user.profile.v1",
      runtime: context.github.binding,
      signalKeys: [ownerProfileKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_user_profile_read_completed", result.meta, {
      login: result.data.login
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_user_profile_read_not_found");

      return null;
    }

    throw error;
  }
}

export function getUserProfile(context: OrpcContext): Promise<GitHubUserProfile | null> {
  return _fetchUserProfile(context, context.github.publicOctokit);
}

export function getPrivateUserProfile(context: OrpcContext): Promise<GitHubUserProfile | null> {
  return _fetchUserProfile(context, context.github.privateOctokit);
}
