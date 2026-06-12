import { type GitHubGraphQLRateLimit } from "#@/repo/shared.types";

export type GitHubGraphQLRepoBranchesResponse = {
  repository: {
    defaultBranchRef: {
      name: string;
    } | null;
    refs: {
      nodes: Array<{
        name: string;
        target: {
          committedDate: string | null;
          oid: string | null;
          url?: string | null;
        } | null;
      } | null>;
    };
  } | null;
  rateLimit: Pick<GitHubGraphQLRateLimit, "remaining" | "resetAt">;
};
