import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  executeGitHubGraphQL,
  getErrorStatusCode,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { type GitHubGraphQLRepoBranchesResponse } from "#@/repo/repo-branches/repo-branches.types";
import { mapGraphQLRepoBranches } from "#@/repo/repo-branches/repo-branches.utils";
import {
  createGraphQLResponseMetadata,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import {
  type RepoAccessSurface,
  createRepoNotFoundError,
  rejectPrivateEntityOnPublicSurface,
  repoCacheResource,
  withPublicGithubClient
} from "#@/shared/public-repo-access";
import { type GitHubRepoBranch } from "#@/types";

async function _fetchRepoBranches(
  input: { repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubRepoBranch[]> {
  setRepoLoggerContext(context, "getRepoBranches", {
    repo: input.repo,
    surface
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_branches_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getCachedGitHubRequest<GitHubRepoBranch[]>({
      fetcher: async () => {
        const response = await withPublicGithubClient(octokit, surface, (client) =>
          executeGitHubGraphQL<
            GitHubGraphQLRepoBranchesResponse & {
              repository:
                | (GitHubGraphQLRepoBranchesResponse["repository"] & {
                    isPrivate?: boolean;
                  })
                | null;
            }
          >(
            client,
            "getRepoBranches.graphql",
            `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              isPrivate
              defaultBranchRef {
                name
              }
              refs(refPrefix: "refs/heads/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
                nodes {
                  name
                  target {
                    ... on Commit {
                      committedDate
                      oid
                      url
                    }
                  }
                }
              }
            }
            rateLimit {
              remaining
              resetAt
            }
          }`,
            {
              owner: source.owner,
              repo: input.repo
            }
          )
        );

        if (!response.repository) {
          throw createRepoNotFoundError(source.owner, input.repo);
        }

        rejectPrivateEntityOnPublicSurface(
          surface,
          response.repository.isPrivate,
          source.owner,
          input.repo
        );

        return {
          data: mapGraphQLRepoBranches(response.repository),
          kind: "success",
          metadata: createGraphQLResponseMetadata(response.rateLimit)
        };
      },
      freshForMs: githubCachePolicy.repoMeta.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: repoCacheResource("repo.branches.v2", surface),
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_branches_read_completed", result.meta, {
      branchCount: result.data.length
    });

    return result.data;
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_branches_read_not_found");

      return [];
    }

    if (surface === "public") {
      setRepoLoggerOutcome(context, "github_repo_branches_read_failed_public", {
        statusCode: getErrorStatusCode(error),
        message: error instanceof Error ? error.message : String(error)
      });
      return [];
    }

    throw error;
  }
}

export function getRepoBranches(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoBranch[]> {
  return _fetchRepoBranches(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoBranches(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoBranch[]> {
  return _fetchRepoBranches(input, context, context.github.privateOctokit, "private");
}
