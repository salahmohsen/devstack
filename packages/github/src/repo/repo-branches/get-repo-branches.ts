import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubGraphQLRepoBranchesResponse } from "#@/repo/repo-branches/repo-branches.types";
import { mapGraphQLRepoBranches } from "#@/repo/repo-branches/repo-branches.utils";
import {
  createGraphQLResponseMetadata,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubRepoBranch } from "#@/types";

export async function getRepoBranches(
  input: {
    repo: string;
  },
  context?: OrpcContext
): Promise<GitHubRepoBranch[]> {
  setRepoLoggerContext(context, "getRepoBranches", {
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_branches_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getGitHubResourceLocalFirst<GitHubRepoBranch[]>({
      fetcher: async () => {
        const response = await executeGitHubGraphQL<GitHubGraphQLRepoBranchesResponse>(
          octokit,
          `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              defaultBranchRef {
                name
              }
              refs(refPrefix: "refs/heads/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
                nodes {
                  name
                  target {
                    ... on Commit {
                      committedDate
                      oid
                      url
                    }
                  }
                }
              }
            }
            rateLimit {
              remaining
              resetAt
            }
          }`,
          input
        );

        return {
          data: mapGraphQLRepoBranches(response.repository),
          kind: "success",
          metadata: createGraphQLResponseMetadata(response.rateLimit)
        };
      },
      freshForMs: githubCachePolicy.repoMeta.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "repo.branches.v1",
      runtime: context?.github,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_branches_read_completed", result.meta, {
      branchCount: result.data.length
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_repo_branches_read_not_found");

      return [];
    }

    throw error;
  }
}
