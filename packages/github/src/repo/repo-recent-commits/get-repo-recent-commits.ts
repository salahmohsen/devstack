import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import { createGitHubResponseMetadata, getErrorStatusCode } from "#@/infrastructure/octokit/client";
import { mapRepoRecentCommits } from "#@/repo/repo-recent-commits/repo-recent-commits.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type RepoRecentCommit } from "#@/schemas";

export async function getRepoRecentCommits(
  input: { owner: string; repo: string; perPage: number },
  context: OrpcContext
): Promise<RepoRecentCommit[]> {
  setRepoLoggerContext(context, "getRepoRecentCommits", {
    repo: input.repo,
    perPage: input.perPage
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_recent_commits_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getGitHubResourceLocalFirst<RepoRecentCommit[]>({
      fetcher: async (conditionals) => {
        const response = await context.github.octokit.rest.repos.listCommits({
          owner: source.owner,
          per_page: input.perPage,
          repo: input.repo,
          headers: buildGitHubConditionalHeaders(conditionals)
        });

        return {
          data: mapRepoRecentCommits(response.data),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.activity.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "repo.recentCommits.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_recent_commits_read_completed",
      result.meta,
      {
        commitCount: result.data.length
      }
    );

    return result.data;
  } catch (error) {
    setRepoLoggerOutcome(context, "github_repo_recent_commits_read_failed", {
      statusCode: getErrorStatusCode(error)
    });

    return [];
  }
}
