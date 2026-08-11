import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { type GitHubRepoCommitListItem } from "#@/repo/repo-commit-sparkline/repo-commit-sparkline.types";
import {
  emptyRepoCommitSparkline,
  getRepoCommitSparklineSince,
  mapRepoCommitSparkline
} from "#@/repo/repo-commit-sparkline/repo-commit-sparkline.utils";
import {
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import {
  type RepoAccessSurface,
  assertRepoVisibleOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName,
  withPublicGithubClient
} from "#@/shared/public-repo-access";
import { type GitHubRepoCommitSparkline } from "#@/types";

async function _fetchRepoCommitSparkline(
  input: { repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubRepoCommitSparkline> {
  setRepoLoggerContext(context, "getRepoCommitSparkline", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_commit_sparkline_read_skipped", {
      reason: source.reason
    });

    return emptyRepoCommitSparkline();
  }

  const { owner: repoOwner, name: repoName } = resolveRepoOwnerName(input.repo, source.owner);

  try {
    await assertRepoVisibleOnPublicSurface(octokit, repoOwner, repoName, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_public_access_denied_or_missing");
      return emptyRepoCommitSparkline();
    }
    throw error;
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });
  const since = getRepoCommitSparklineSince();

  try {
    const result = await getCachedGitHubRequest<GitHubRepoCommitSparkline>({
      fetcher: async () => {
        // Prefer tenant OAuth; on public surface retry anonymous if the token is dead.
        const response = await withPublicGithubClient(octokit, surface, (client) =>
          client.rest.repos.listCommits({
            owner: repoOwner,
            per_page: 100,
            repo: repoName,
            since
          })
        );

        return {
          data: mapRepoCommitSparkline(response.data as GitHubRepoCommitListItem[]),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.detail.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: repoCacheResource("repo.commitSparkline.v2", surface),
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_commit_sparkline_read_completed",
      result.meta,
      {
        weeklyCommitCount: result.data.weeklyCommits.length
      }
    );

    return result.data;
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_commit_sparkline_read_not_found");

      return emptyRepoCommitSparkline();
    }

    throw error;
  }
}

export function getRepoCommitSparkline(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoCommitSparkline> {
  return _fetchRepoCommitSparkline(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoCommitSparkline(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoCommitSparkline> {
  return _fetchRepoCommitSparkline(input, context, context.github.privateOctokit, "private");
}
