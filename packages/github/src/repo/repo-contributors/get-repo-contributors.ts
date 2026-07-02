import { type OrpcContext } from "@tsu-stack/core/orpc-context";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  mapOctokitContributor,
  parseLinkHeaderLastPage
} from "#@/repo/repo-contributors/repo-contributors.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type RepoContributorsResult } from "#@/schemas";

async function _fetchRepoContributors(
  input: { repo: string },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<RepoContributorsResult> {
  setRepoLoggerContext(context, "getRepoContributors", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_contributors_read_skipped", {
      reason: source.reason
    });

    return { contributors: [], totalCount: 0 };
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getGitHubResourceLocalFirst<RepoContributorsResult>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.listContributors({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner: source.owner,
          repo: input.repo,
          per_page: 30,
          anon: "false"
        });

        const totalCount =
          parseLinkHeaderLastPage(response.headers.link as string | undefined) ??
          response.data.length;

        return {
          data: {
            contributors: response.data
              .filter((c): c is typeof c & { login: string } => !!c.login)
              .map(mapOctokitContributor),
            totalCount
          },
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.repoMeta.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "repo.contributors.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_contributors_read_completed",
      result.meta,
      {
        contributorCount: result.data.contributors.length,
        totalCount: result.data.totalCount
      }
    );

    return result.data;
  } catch (error) {
    setRepoLoggerOutcome(context, "github_repo_contributors_read_failed", {
      statusCode: getErrorStatusCode(error)
    });

    return { contributors: [], totalCount: 0 };
  }
}

export function getRepoContributors(
  input: { repo: string },
  context: OrpcContext
): Promise<RepoContributorsResult> {
  return _fetchRepoContributors(input, context, context.github.publicOctokit);
}

export function getPrivateRepoContributors(
  input: { repo: string },
  context: OrpcContext
): Promise<RepoContributorsResult> {
  return _fetchRepoContributors(input, context, context.github.privateOctokit);
}
