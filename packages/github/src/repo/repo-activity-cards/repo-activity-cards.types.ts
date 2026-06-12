import { type GitHubGraphQLRateLimit } from "#@/repo/shared.types";

export type GitHubGraphQLRepoActivityCardsResponse = {
  repository: {
    issues: {
      nodes: Array<{
        comments: {
          totalCount: number;
        };
        number: number;
        state: "OPEN" | "CLOSED";
        title: string;
        updatedAt: string;
        url: string;
      } | null>;
      totalCount: number;
    };
    pullRequests: {
      nodes: Array<{
        comments: {
          totalCount: number;
        };
        mergedAt: string | null;
        number: number;
        state: "OPEN" | "CLOSED" | "MERGED";
        title: string;
        updatedAt: string;
        url: string;
      } | null>;
      totalCount: number;
    };
  } | null;
  rateLimit: Pick<GitHubGraphQLRateLimit, "remaining" | "resetAt">;
};

export type GitHubWorkflowRunListItem = {
  conclusion: string | null;
  created_at?: string | null;
  display_title?: string | null;
  html_url?: string | null;
  id: number;
  name?: string | null;
  run_started_at?: string | null;
  status?: string | null;
};
