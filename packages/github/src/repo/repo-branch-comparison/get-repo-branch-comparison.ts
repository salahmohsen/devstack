import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { mapGitHubRepoBranchComparison } from "#@/repo/repo-branch-comparison/repo-branch-comparison.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubRepoBranchComparison } from "#@/types";

export async function getRepoBranchComparison(
  input: {
    base: string;
    head: string;
    owner: string;
    repo: string;
  },
  context?: OrpcContext
): Promise<GitHubRepoBranchComparison | null> {
  setRepoLoggerContext(context, "getRepoBranchComparison", {
    base: input.base,
    head: input.head,
    owner: input.owner,
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_branch_comparison_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.repoCode(input);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubRepoBranchComparison>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.compareCommits({
          base: input.base,
          headers: buildGitHubConditionalHeaders(conditionals),
          head: input.head,
          owner: input.owner,
          repo: input.repo
        });

        return {
          data: mapGitHubRepoBranchComparison(response.data),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.detail.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "repo.branch-comparison.v1",
      runtime: context?.github,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_branch_comparison_read_completed",
      result.meta,
      {
        aheadBy: result.data.aheadBy,
        behindBy: result.data.behindBy
      }
    );

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_repo_branch_comparison_read_not_found");

      return null;
    }

    throw error;
  }
}
