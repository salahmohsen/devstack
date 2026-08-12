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
  isGitHubAuthError,
  repoCacheResource,
  resolveRepoOwnerName,
  withPublicGithubClient
} from "#@/shared/public-repo-access";

/** Private-surface auth/config failure — callers must not treat as "file missing". */
export function createGitHubPrivateAuthError(message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = 401;
  error.name = "GitHubPrivateAuthError";
  return error;
}

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
      reason: source.reason,
      surface
    });
    // Private path must not silently look like "file not found" — detect-stacks
    // and dashboard private reads need a real OAuth session with `repo` scope.
    if (surface === "private") {
      throw createGitHubPrivateAuthError(
        "GitHub OAuth is not configured for this session. Link GitHub (with repo access) and sign in again."
      );
    }
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
    // Private surface: surface auth failures so callers can prompt re-login.
    // Public surface: keep soft-null for guests (private repos look like not-found).
    if (surface === "private" && isGitHubAuthError(error)) {
      setRepoLoggerOutcome(context, "github_repo_file_content_read_auth_failed", {
        statusCode: getErrorStatusCode(error)
      });
      throw createGitHubPrivateAuthError(
        "GitHub rejected your OAuth token for a private repository read. " +
          "Link GitHub under Settings with the `repo` scope, then sign out and sign back in " +
          "so the server can refresh your token (tokens never leave the server)."
      );
    }

    // 404 / not-found and all non-auth failures soft-null for both surfaces.
    // Only auth failures rethrow on private (above) so callers can prompt re-login
    // without turning rate limits / 5xx into hard dashboard errors.
    setRepoLoggerOutcome(context, "github_repo_file_content_read_not_found", {
      statusCode: getErrorStatusCode(error) ?? (isGitHubNotFoundError(error) ? 404 : null)
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
