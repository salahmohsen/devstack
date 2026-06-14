import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { setRepoLoggerLocalFirstOutcome, setRepoLoggerOutcome } from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubPinnedRepo } from "#@/types";

const DEBUG_TAG = "23478236498372";

export async function getUserPinnedRepos(context?: OrpcContext): Promise<GitHubPinnedRepo[]> {
  console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:start`);

  console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:resolvePublicGitHubSource:start`);
  const source = await resolvePublicGitHubSource();
  console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:resolvePublicGitHubSource:ok`, {
    isConfigured: source.isConfigured,
    owner: source.isConfigured ? source.owner : null
  });

  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_user_pinned_repos_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.ownerPinnedRepos(source.owner);

  try {
    console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:getGitHubResourceLocalFirst:start`, {
      owner: source.owner,
      signalKey
    });
    const result = await getGitHubResourceLocalFirst<GitHubPinnedRepo[]>({
      fetcher: async () => {
        console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:fetcher:executeGitHubGraphQL:start`, {
          owner: source.owner
        });
        const response = await executeGitHubGraphQL<{
          rateLimit: {
            remaining: number;
            resetAt: string;
          };
          user: {
            pinnedItems: {
              nodes: Array<{
                description: string | null;
                forkCount: number;
                isPrivate: boolean;
                name: string;
                owner: { login: string };
                primaryLanguage: { color: string | null; name: string } | null;
                stargazerCount: number;
                url: string;
              } | null>;
            };
          };
        }>(
          octokit,
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
        console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:fetcher:executeGitHubGraphQL:ok`, {
          owner: source.owner,
          pinnedItems: response.user.pinnedItems.nodes.length
        });

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
      runtime: context?.github,
      signalKeys: [signalKey]
    });
    console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:getGitHubResourceLocalFirst:ok`, {
      cacheStatus: result.meta.cacheStatus,
      repoCount: result.data.length
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
    console.debug(`[${DEBUG_TAG}] getUserPinnedRepos:error`, error);
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
