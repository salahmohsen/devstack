import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  executeGitHubGraphQL,
  getErrorStatusCode,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { type GitHubGraphQLRepoDiscussionsResponse } from "#@/repo/repo-discussions/repo-discussions.types";
import {
  emptyDiscussionsResult,
  mapGraphQLRepoDiscussions
} from "#@/repo/repo-discussions/repo-discussions.utils";
import {
  createGraphQLResponseMetadata,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubDiscussionsResult } from "#@/schemas";
import {
  type RepoAccessSurface,
  assertRepoVisibleOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName
} from "#@/shared/public-repo-access";

const REPO_DISCUSSIONS_DEFAULT_FIRST = 5;
const REPO_DISCUSSIONS_MAX_FIRST = 50;

function clampFirst(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REPO_DISCUSSIONS_DEFAULT_FIRST;
  }
  return Math.min(
    Math.max(Math.trunc(value ?? REPO_DISCUSSIONS_DEFAULT_FIRST), 1),
    REPO_DISCUSSIONS_MAX_FIRST
  );
}

async function _fetchRepoDiscussions(
  input: { repo: string; first?: number },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubDiscussionsResult> {
  setRepoLoggerContext(context, "getRepoDiscussions", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_discussions_read_skipped", {
      reason: source.reason
    });
    return emptyDiscussionsResult();
  }

  try {
    const { owner: privacyOwner, name: privacyRepo } = resolveRepoOwnerName(
      input.repo,
      source.owner
    );
    await assertRepoVisibleOnPublicSurface(octokit, privacyOwner, privacyRepo, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_public_access_denied_or_missing");
      return emptyDiscussionsResult();
    }
    throw error;
  }

  const owner = source.owner;
  const repo = input.repo;
  const signalKey = githubRevalidationSignalKeys.repoMeta({ owner, repo });
  const first = clampFirst(input.first);

  try {
    const result = await getCachedGitHubRequest<GitHubDiscussionsResult>({
      fetcher: async () => {
        try {
          const response = await executeGitHubGraphQL<GitHubGraphQLRepoDiscussionsResponse>(
            octokit,
            "getRepoDiscussions.graphql",
            `query($owner: String!, $repo: String!, $first: Int!) {
              repository(owner: $owner, name: $repo) {
                isPrivate
                discussions(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
                  totalCount
                  nodes {
                    number
                    title
                    createdAt
                    updatedAt
                    author { login avatarUrl }
                    category { name }
                    comments { totalCount }
                    answerChosenAt
                    url
                  }
                }
              }
              rateLimit {
                remaining
                resetAt
              }
            }`,
            { owner, repo, first }
          );

          if (!response.repository) {
            return {
              data: emptyDiscussionsResult(),
              kind: "success",
              metadata: createGraphQLResponseMetadata(response.rateLimit)
            };
          }

          // Privacy already gated via assertRepoVisibleOnPublicSurface before cache.
          return {
            data: mapGraphQLRepoDiscussions(response.repository),
            kind: "success",
            metadata: createGraphQLResponseMetadata(response.rateLimit)
          };
        } catch (error) {
          const statusCode = getErrorStatusCode(error);
          if (statusCode === 403 || statusCode === 429) {
            throw error;
          }
          return {
            data: emptyDiscussionsResult(),
            kind: "success",
            metadata: createGitHubResponseMetadata(200, {})
          };
        }
      },
      freshForMs: githubCachePolicy.list.staleTimeMs,
      namespaceKeys: [signalKey],
      owner,
      params: input,
      resource: repoCacheResource("repo.discussions.v2", surface),
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_discussions_read_completed", result.meta, {
      discussionCount: result.data.discussions.length,
      totalCount: result.data.totalCount
    });

    return result.data;
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_discussions_read_not_found");
      return emptyDiscussionsResult();
    }

    throw error;
  }
}

export function getRepoDiscussions(
  input: { repo: string; first?: number },
  context: OrpcContext
): Promise<GitHubDiscussionsResult> {
  return _fetchRepoDiscussions(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoDiscussions(
  input: { repo: string; first?: number },
  context: OrpcContext
): Promise<GitHubDiscussionsResult> {
  return _fetchRepoDiscussions(input, context, context.github.privateOctokit, "private");
}
