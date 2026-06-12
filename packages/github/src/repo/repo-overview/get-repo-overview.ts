import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubGraphQLRepoOverviewResponse } from "#@/repo/repo-overview/repo-overview.types";
import { mapGraphQLRepoOverview } from "#@/repo/repo-overview/repo-overview.utils";
import { type RepoOverview } from "#@/repo/shared.types";
import {
  createGraphQLResponseMetadata,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome,
  withLocalFirstMeta
} from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";

export async function getRepoOverview(
  input: {
    owner: string;
    repo: string;
  },
  context?: OrpcContext
): Promise<RepoOverview | null> {
  setRepoLoggerContext(context, "getRepoOverview", {
    owner: input.owner,
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_overview_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const octokit = createGitHubOctokit(source);
  const repoMetaKey = githubRevalidationSignalKeys.repoMeta(input);
  const repoCodeKey = githubRevalidationSignalKeys.repoCode(input);

  try {
    const result = await getGitHubResourceLocalFirst<RepoOverview>({
      fetcher: async () => {
        const response = await executeGitHubGraphQL<GitHubGraphQLRepoOverviewResponse>(
          octokit,
          `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              databaseId
              name
              nameWithOwner
              description
              isPrivate
              isFork
              defaultBranchRef {
                name
                target {
                  __typename
                  ... on Commit {
                    oid
                    message
                    committedDate
                    author {
                      user {
                        login
                        avatarUrl
                        url
                      }
                    }
                  }
                }
              }
              stargazerCount
              forkCount
              watchers(first: 1) {
                totalCount
              }
              primaryLanguage {
                name
              }
              licenseInfo {
                spdxId
              }
              repositoryTopics(first: 20) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              url
              owner {
                login
                avatarUrl
              }
              branches: refs(refPrefix: "refs/heads/", first: 1) {
                totalCount
              }
              tags: refs(refPrefix: "refs/tags/", first: 1) {
                totalCount
              }
              pullRequests(states: OPEN, first: 1) {
                totalCount
              }
              issues(states: OPEN, first: 1) {
                totalCount
              }
              hasDiscussionsEnabled
              parent {
                nameWithOwner
                owner {
                  avatarUrl
                }
              }
            }
            rateLimit {
              cost
              remaining
              resetAt
            }
          }`,
          {
            owner: input.owner,
            repo: input.repo
          }
        );

        if (!response.repository) {
          throw new Error(`GitHub repository not found: ${input.owner}/${input.repo}`);
        }

        const overview = mapGraphQLRepoOverview(response.repository);
        overview.viewerHasStarred = false;

        return {
          data: overview,
          kind: "success",
          metadata: createGraphQLResponseMetadata(response.rateLimit)
        };
      },
      freshForMs: githubCachePolicy.repoMeta.staleTimeMs,
      namespaceKeys: [repoMetaKey, repoCodeKey],
      owner: source.owner,
      params: input,
      resource: "repo.overview.v2",
      runtime: context?.github,
      signalKeys: [repoMetaKey, repoCodeKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_overview_read_completed", result.meta, {
      hasDiscussions: result.data.hasDiscussions,
      topicCount: result.data.topics.length,
      cacheStatus: result.meta.cacheStatus
    });

    return withLocalFirstMeta(result.data, result.meta);
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_repo_overview_read_not_found");

      return null;
    }

    throw error;
  }
}
