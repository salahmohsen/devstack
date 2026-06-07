import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
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
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubRepoCommitSparkline } from "#@/types";

export async function getRepoCommitSparkline(
  input: {
    owner: string;
    repo: string;
  },
  context?: OrpcContext
): Promise<GitHubRepoCommitSparkline> {
  setRepoLoggerContext(context, "getRepoCommitSparkline", {
    owner: input.owner,
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_commit_sparkline_read_skipped", {
      reason: source.reason
    });

    return emptyRepoCommitSparkline();
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.repoCode(input);
  const since = getRepoCommitSparklineSince();

  try {
    const result = await getGitHubResourceLocalFirst<GitHubRepoCommitSparkline>({
      fetcher: async () => {
        const response = await octokit.rest.repos.listCommits({
          owner: input.owner,
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
      runtime: context?.github,
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
