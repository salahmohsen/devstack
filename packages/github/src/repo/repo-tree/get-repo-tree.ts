import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { type GitHubRepoTreeItem } from "#@/repo/repo-tree/repo-tree.types";
import { mapGitHubRepoTreeEntries } from "#@/repo/repo-tree/repo-tree.utils";
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
  resolveRepoOwnerName,
  withPublicGithubClient
} from "#@/shared/public-repo-access";
import { type GitHubRepoTreeEntry } from "#@/types";

async function _fetchRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubRepoTreeEntry[]> {
  setRepoLoggerContext(context, "getRepoTree", {
    path: input.path,
    ref: input.ref,
    repo: input.repo,
    surface
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_tree_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const { owner: repoOwner, name: repoName } = resolveRepoOwnerName(input.repo, source.owner);

  try {
    // Privacy gate before cache so `.public` never stores private tree entries.
    await assertRepoVisibleOnPublicSurface(octokit, repoOwner, repoName, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_tree_read_not_found");
      return [];
    }
    throw error;
  }

  const repoCodeKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getCachedGitHubRequest<GitHubRepoTreeEntry[]>({
      fetcher: async (conditionals) => {
        const response = await withPublicGithubClient(octokit, surface, (client) =>
          client.rest.repos.getContent({
            headers: buildGitHubConditionalHeaders(conditionals),
            owner: repoOwner,
            path: input.path,
            ref: input.ref,
            repo: repoName
          })
        );

        return {
          data: mapGitHubRepoTreeEntries(
            response.data as GitHubRepoTreeItem[] | GitHubRepoTreeItem
          ),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.detail.staleTimeMs,
      namespaceKeys: [repoCodeKey],
      owner: source.owner,
      params: input,
      resource: repoCacheResource("repo.tree.v2", surface),
      runtime: context.github.binding,
      signalKeys: [repoCodeKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_tree_read_completed", result.meta, {
      entryCount: result.data.length
    });

    return result.data;
  } catch (error) {
    setRepoLoggerOutcome(context, "github_repo_tree_read_not_found", {
      statusCode: getErrorStatusCode(error) ?? (isGitHubNotFoundError(error) ? 404 : null)
    });

    return [];
  }
}

export function getRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoTreeEntry[]> {
  return _fetchRepoTree(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoTreeEntry[]> {
  return _fetchRepoTree(input, context, context.github.privateOctokit, "private");
}
