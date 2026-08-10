import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { type GitHubRepoRefCommitItem } from "#@/repo/repo-ref-commit/repo-ref-commit.types";
import { mapGitHubRepoLatestCommit } from "#@/repo/repo-ref-commit/repo-ref-commit.utils";
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
import { type GitHubRepoLatestCommit } from "#@/types";

async function _fetchRepoRefCommit(
  input: { ref: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubRepoLatestCommit | null> {
  setRepoLoggerContext(context, "getRepoRefCommit", {
    ref: input.ref,
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_ref_commit_read_skipped", {
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
    const result = await getCachedGitHubRequest<GitHubRepoLatestCommit>({
      fetcher: async () => {
        const response = await withPublicGithubClient(octokit, surface, (client) =>
          client.rest.repos.listCommits({
            owner: source.owner,
            per_page: 1,
            repo: input.repo,
            sha: input.ref
          })
        );

        return {
          data: mapGitHubRepoLatestCommit(response.data[0] as GitHubRepoRefCommitItem | undefined),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.detail.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: repoCacheResource("repo.refCommit.v2", surface),
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_ref_commit_read_completed", result.meta, {
      foundCommit: result.data !== null
    });

    return result.data;
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_ref_commit_read_not_found");

      return null;
    }

    if (surface === "public") {
      setRepoLoggerOutcome(context, "github_repo_ref_commit_read_failed_public");
      return null;
    }

    throw error;
  }
}

export function getRepoRefCommit(
  input: { ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoLatestCommit | null> {
  return _fetchRepoRefCommit(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoRefCommit(
  input: { ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoLatestCommit | null> {
  return _fetchRepoRefCommit(input, context, context.github.privateOctokit, "private");
}
