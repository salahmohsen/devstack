import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { mapGitHubRepoFileContent } from "#@/repo/repo-file-content/repo-file-content.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";

export async function getRepoFileContent(
  input: {
    owner: string;
    path: string;
    ref: string;
    repo: string;
  },
  context?: OrpcContext
): Promise<string | null> {
  setRepoLoggerContext(context, "getRepoFileContent", {
    owner: input.owner,
    path: input.path,
    ref: input.ref,
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_file_content_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const octokit = createGitHubOctokit(source);
  const repoCodeKey = githubRevalidationSignalKeys.repoCode(input);

  try {
    const result = await getGitHubResourceLocalFirst<string | null>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.getContent({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner: input.owner,
          path: input.path,
          ref: input.ref,
          repo: input.repo
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
      resource: "repo.fileContent.v1",
      runtime: context?.github,
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
      statusCode: getErrorStatusCode(error)
    });

    return null;
  }
}
