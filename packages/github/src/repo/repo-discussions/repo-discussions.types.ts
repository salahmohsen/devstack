import { type GitHubGraphQLRateLimit } from "#@/repo/shared.types";

export type GitHubGraphQLRepoDiscussionsResponse = {
  repository: {
    discussions: {
      nodes: Array<{
        answerChosenAt: string | null;
        author: { avatarUrl: string; login: string } | null;
        category: { name: string } | null;
        comments: { totalCount: number };
        createdAt: string;
        number: number;
        title: string;
        updatedAt: string;
        url: string;
      } | null>;
      totalCount: number;
    };
  } | null;
  rateLimit: Pick<GitHubGraphQLRateLimit, "remaining" | "resetAt">;
};
