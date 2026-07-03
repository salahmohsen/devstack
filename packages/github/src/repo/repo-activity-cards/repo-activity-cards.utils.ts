import { createGitHubResponseMetadata } from "#@/infrastructure/octokit/client";
import {
  type GitHubGraphQLRepoActivityCardsResponse,
  type GitHubWorkflowRunListItem
} from "#@/repo/repo-activity-cards/repo-activity-cards.types";
import { type GitHubRepoActivityCardAction, type GitHubRepoActivityCards } from "#@/types";

export function emptyActivityCards(): GitHubRepoActivityCards {
  return {
    actions: [],
    issues: [],
    openIssuesCount: 0,
    openPullRequestsCount: 0,
    pullRequests: []
  };
}

export function mapWorkflowRuns(
  workflowRuns: GitHubWorkflowRunListItem[]
): GitHubRepoActivityCardAction[] {
  return workflowRuns.map((run) => {
    return {
      conclusion: run.conclusion ?? null,
      id: run.id,
      name: run.display_title ?? run.name ?? "Workflow run",
      startedAt: run.run_started_at ?? run.created_at ?? null,
      status: run.status ?? "unknown",
      url: run.html_url ?? null
    };
  });
}

function hashIdToNumber(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function mapGraphQLRepoActivityCards(
  repository: GitHubGraphQLRepoActivityCardsResponse["repository"],
  actions: GitHubRepoActivityCardAction[]
): GitHubRepoActivityCards {
  return {
    actions,
    issues:
      repository?.issues.nodes.flatMap((issue) =>
        issue
          ? [
              {
                comments: issue.comments.totalCount,
                id: hashIdToNumber(issue.id),
                number: issue.number,
                state: issue.state === "OPEN" ? "open" : "closed",
                title: issue.title,
                updatedAt: issue.updatedAt,
                url: issue.url
              }
            ]
          : []
      ) ?? [],
    openIssuesCount: repository?.issues.totalCount ?? 0,
    openPullRequestsCount: repository?.pullRequests.totalCount ?? 0,
    pullRequests:
      repository?.pullRequests.nodes.flatMap((pullRequest) =>
        pullRequest
          ? [
              {
                comments: pullRequest.comments.totalCount,
                id: hashIdToNumber(pullRequest.id),
                number: pullRequest.number,
                state: pullRequest.mergedAt
                  ? "merged"
                  : pullRequest.state === "OPEN"
                    ? "open"
                    : "closed",
                title: pullRequest.title,
                updatedAt: pullRequest.updatedAt,
                url: pullRequest.url
              }
            ]
          : []
      ) ?? []
  };
}

export function createRepoActivityCardsMetadata(
  rateLimit: GitHubGraphQLRepoActivityCardsResponse["rateLimit"],
  headers: Record<string, string | number | string[] | undefined>
) {
  return createGitHubResponseMetadata(200, {
    ...headers,
    "x-ratelimit-remaining": String(rateLimit.remaining),
    "x-ratelimit-reset": String(Math.floor(new Date(rateLimit.resetAt).getTime() / 1_000))
  });
}
