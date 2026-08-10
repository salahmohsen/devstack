import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { mapGitHubRepoBranchComparison } from "#@/repo/repo-branch-comparison/repo-branch-comparison.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import {
  type RepoAccessSurface,
  assertRepoVisibleOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName
} from "#@/shared/public-repo-access";
import { type GitHubRepoBranchComparison } from "#@/types";

async function _fetchRepoBranchComparison(
  input: { base: string; head: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubRepoBranchComparison | null> {
  setRepoLoggerContext(context, "getRepoBranchComparison", {
    base: input.base,
    head: input.head,
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_branch_comparison_read_skipped", {
      reason: source.reason
    });

    return null;
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
      return null;
    }
    throw error;
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getCachedGitHubRequest<GitHubRepoBranchComparison>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.compareCommits({
          base: input.base,
          headers: buildGitHubConditionalHeaders(conditionals),
          head: input.head,
          owner: source.owner,
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
      resource: repoCacheResource("repo.branch-comparison.v2", surface),
      runtime: context.github.binding,
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
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_branch_comparison_read_not_found");

      return null;
    }

    throw error;
  }
}

export function getRepoBranchComparison(
  input: { base: string; head: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoBranchComparison | null> {
  return _fetchRepoBranchComparison(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoBranchComparison(
  input: { base: string; head: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoBranchComparison | null> {
  return _fetchRepoBranchComparison(input, context, context.github.privateOctokit, "private");
}
