import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
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
import { type GitHubRepoCommitSparkline } from "#@/types";

async function _fetchRepoCommitSparkline(
  input: { repo: string },
  context: OrpcContext,
  octokit: GitHubClient
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

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });
  const since = getRepoCommitSparklineSince();

  try {
    const result = await getCachedGitHubRequest<GitHubRepoCommitSparkline>({
      fetcher: async () => {
        const response = await octokit.rest.repos.listCommits({
          owner: source.owner,
          per_page: 100,
          repo: input.repo,
          since
        });

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
      resource: "repo.commitSparkline.v1",
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
    if (getErrorStatusCode(error) === 404) {
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
  return _fetchRepoCommitSparkline(input, context, context.github.publicOctokit);
}

export function getPrivateRepoCommitSparkline(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoCommitSparkline> {
  return _fetchRepoCommitSparkline(input, context, context.github.privateOctokit);
}
