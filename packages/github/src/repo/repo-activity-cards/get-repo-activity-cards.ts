import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubGraphQLRepoActivityCardsResponse } from "#@/repo/repo-activity-cards/repo-activity-cards.types";
import {
  createRepoActivityCardsMetadata,
  emptyActivityCards,
  mapGraphQLRepoActivityCards,
  mapWorkflowRuns
} from "#@/repo/repo-activity-cards/repo-activity-cards.utils";
import {
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubRepoActivityCards } from "#@/types";

async function _fetchRepoActivityCards(
  input: { repo: string },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubRepoActivityCards> {
  setRepoLoggerContext(context, "getRepoActivityCards", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_activity_cards_read_skipped", {
      reason: source.reason
    });

    return emptyActivityCards();
  }

  const signalKey = githubRevalidationSignalKeys.repoMeta({
    owner: source.owner,
    repo: input.repo
  });

  try {
    const result = await getGitHubResourceLocalFirst<GitHubRepoActivityCards>({
      fetcher: async () => {
        const [graph, workflowRuns] = await Promise.all([
          executeGitHubGraphQL<GitHubGraphQLRepoActivityCardsResponse>(
            octokit,
            "getRepoActivityCards.graphql",
            `query($owner: String!, $repo: String!) {
              repository(owner: $owner, name: $repo) {
                pullRequests(first: 5, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
                  totalCount
                  nodes {
                    comments {
                      totalCount
                    }
                    mergedAt
                    number
                    state
                    title
                    updatedAt
                    url
                  }
                }
                issues(first: 5, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
                  totalCount
                  nodes {
                    comments {
                      totalCount
                    }
                    number
                    state
                    title
                    updatedAt
                    url
                  }
                }
              }
              rateLimit {
                remaining
                resetAt
              }
            }`,
            {
              owner: source.owner,
              repo: input.repo
            }
          ),
          octokit.rest.actions
            .listWorkflowRunsForRepo({
              owner: source.owner,
              per_page: 5,
              repo: input.repo
            })
            .then((response) => {
              return {
                headers: response.headers,
                runs: mapWorkflowRuns(response.data.workflow_runs)
              };
            })
            .catch((error) => {
              if (getErrorStatusCode(error) === 404 || getErrorStatusCode(error) === 403) {
                return {
                  headers: {},
                  runs: []
                };
              }

              throw error;
            })
        ]);

        return {
          data: mapGraphQLRepoActivityCards(graph.repository, workflowRuns.runs),
          kind: "success",
          metadata: createRepoActivityCardsMetadata(graph.rateLimit, workflowRuns.headers)
        };
      },
      freshForMs: githubCachePolicy.activity.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "repo.activityCards.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_activity_cards_read_completed",
      result.meta,
      {
        actionCount: result.data.actions.length,
        issueCount: result.data.issues.length,
        pullRequestCount: result.data.pullRequests.length
      }
    );

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_repo_activity_cards_read_not_found");

      return emptyActivityCards();
    }

    throw error;
  }
}

export function getRepoActivityCards(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoActivityCards> {
  return _fetchRepoActivityCards(input, context, context.github.publicOctokit);
}

export function getPrivateRepoActivityCards(
  input: { repo: string },
  context: OrpcContext
): Promise<GitHubRepoActivityCards> {
  return _fetchRepoActivityCards(input, context, context.github.privateOctokit);
}
