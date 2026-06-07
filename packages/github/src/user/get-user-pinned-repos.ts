import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  executeGitHubGraphQL
} from "#@/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubPinnedRepo } from "#@/types";

export async function getUserPinnedRepos(
  username: string,
  runtime?: GitHubRuntimeBindings
): Promise<GitHubPinnedRepo[]> {
  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    return [];
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.ownerPinnedRepos(username);

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
          { username }
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
      params: { username },
      resource: "user.pinnedRepos.v1",
      runtime,
      signalKeys: [signalKey]
    });

    return result.data;
  } catch {
    return [];
  }
}
