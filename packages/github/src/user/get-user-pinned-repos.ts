import { type OrpcContext } from "@tsu-stack/core/orpc-context";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { setRepoLoggerLocalFirstOutcome, setRepoLoggerOutcome } from "#@/repo/shared.utils";
import { type GitHubPinnedRepo } from "#@/types";

async function _fetchUserPinnedRepos(
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubPinnedRepo[]> {
  const source = context.github.source;

  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_user_pinned_repos_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const signalKey = githubRevalidationSignalKeys.ownerPinnedRepos(source.owner);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubPinnedRepo[]>({
      fetcher: async () => {
        const response = await executeGitHubGraphQL<{
          rateLimit: {
            remaining: number;
            resetAt: string;
          };
          user: {
            pinnedItems: {
              nodes: Array<{
                name: string;
                description: string | null;
                stargazerCount: number;
                primaryLanguage: { name: string; color: string } | null;
                url: string;
                owner: { login: string };
                isPrivate: boolean;
                forkCount: number;
              } | null>;
            };
          };
        }>(
          octokit,
          "getUserPinnedRepos.graphql",
          `query($username: String!) {
            user(login: $username) {
              pinnedItems(first: 6, types: REPOSITORY) {
                nodes {
                  ... on Repository {
                    name
                    description
                    stargazerCount
                    primaryLanguage {
                      name
                      color
                    }
                    url
                    owner {
                      login
                    }
                    isPrivate
                    forkCount
                  }
                }
              }
            }
            rateLimit {
              remaining
              resetAt
            }
          }`,
          { username: source.owner }
        );

        return {
          data: response.user.pinnedItems.nodes.flatMap((repo) =>
            repo
              ? [
                  {
                    description: repo.description,
                    forks: repo.forkCount,
                    isPrivate: repo.isPrivate,
                    language: repo.primaryLanguage?.name ?? null,
                    languageColor: repo.primaryLanguage?.color ?? null,
                    name: repo.name,
                    owner: repo.owner.login,
                    stars: repo.stargazerCount,
                    url: repo.url
                  }
                ]
              : []
          ),
          kind: "success",
          metadata: createGitHubResponseMetadata(200, {
            "x-ratelimit-remaining": String(response.rateLimit.remaining),
            "x-ratelimit-reset": String(
              Math.floor(new Date(response.rateLimit.resetAt).getTime() / 1000)
            )
          })
        };
      },
      freshForMs: githubCachePolicy.mine.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: { username: source.owner },
      resource: "user.pinnedRepos.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_user_pinned_repos_read_completed",
      result.meta,
      {
        repoCount: result.data.length
      }
    );

    return result.data;
  } catch (error) {
    const statusCode = getErrorStatusCode(error);

    setRepoLoggerOutcome(
      context,
      statusCode === 404
        ? "github_user_pinned_repos_read_not_found"
        : "github_user_pinned_repos_read_failed",
      statusCode ? { statusCode } : {}
    );

    return [];
  }
}

export function getUserPinnedRepos(context: OrpcContext): Promise<GitHubPinnedRepo[]> {
  return _fetchUserPinnedRepos(context, context.github.publicOctokit);
}

export function getPrivateUserPinnedRepos(context: OrpcContext): Promise<GitHubPinnedRepo[]> {
  return _fetchUserPinnedRepos(context, context.github.privateOctokit);
}
