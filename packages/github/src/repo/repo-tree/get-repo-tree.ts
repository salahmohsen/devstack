import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubRepoTreeItem } from "#@/repo/repo-tree/repo-tree.types";
import { mapGitHubRepoTreeEntries } from "#@/repo/repo-tree/repo-tree.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubRepoTreeEntry } from "#@/types";

async function _fetchRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubRepoTreeEntry[]> {
  setRepoLoggerContext(context, "getRepoTree", {
    path: input.path,
    ref: input.ref,
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_tree_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const repoCodeKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getGitHubResourceLocalFirst<GitHubRepoTreeEntry[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.getContent({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner: source.owner,
          path: input.path,
          ref: input.ref,
          repo: input.repo
        });

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
      resource: "repo.tree.v1",
      runtime: context.github.binding,
      signalKeys: [repoCodeKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_tree_read_completed", result.meta, {
      entryCount: result.data.length
    });

    return result.data;
  } catch (error) {
    setRepoLoggerOutcome(context, "github_repo_tree_read_not_found", {
      statusCode: getErrorStatusCode(error)
    });

    return [];
  }
}

export function getRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoTreeEntry[]> {
  return _fetchRepoTree(input, context, context.github.publicOctokit);
}

export function getPrivateRepoTree(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<GitHubRepoTreeEntry[]> {
  return _fetchRepoTree(input, context, context.github.privateOctokit);
}
