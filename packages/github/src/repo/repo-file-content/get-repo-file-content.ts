import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import { mapGitHubRepoFileContent } from "#@/repo/repo-file-content/repo-file-content.utils";
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

async function _fetchRepoFileContent(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<string | null> {
  setRepoLoggerContext(context, "getRepoFileContent", {
    path: input.path,
    ref: input.ref,
    repo: input.repo,
    surface
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_file_content_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const { owner: repoOwner, name: repoName } = resolveRepoOwnerName(input.repo, source.owner);

  try {
    await assertRepoVisibleOnPublicSurface(octokit, repoOwner, repoName, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_file_content_read_not_found");
      return null;
    }
    throw error;
  }

  const repoCodeKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getCachedGitHubRequest<string | null>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.getContent({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner: repoOwner,
          path: input.path,
          ref: input.ref,
          repo: repoName
        });

        return {
          data: mapGitHubRepoFileContent(response.data),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.repoMeta.staleTimeMs,
      namespaceKeys: [repoCodeKey],
      owner: source.owner,
      params: input,
      resource: repoCacheResource("repo.fileContent.v2", surface),
      runtime: context.github.binding,
      signalKeys: [repoCodeKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_file_content_read_completed",
      result.meta,
      {
        hasContent: result.data !== null,
        textLength: result.data?.length ?? 0
      }
    );

    return result.data;
  } catch (error) {
    setRepoLoggerOutcome(context, "github_repo_file_content_read_not_found", {
      statusCode: isGitHubNotFoundError(error) ? 404 : null
    });

    return null;
  }
}

export function getRepoFileContent(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<string | null> {
  return _fetchRepoFileContent(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoFileContent(
  input: { path: string; ref: string; repo: string },
  context: OrpcContext
): Promise<string | null> {
  return _fetchRepoFileContent(input, context, context.github.privateOctokit, "private");
}
