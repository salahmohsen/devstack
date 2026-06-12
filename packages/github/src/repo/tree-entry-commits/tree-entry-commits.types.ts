import { type GitHubGraphQLRateLimit } from "#@/repo/shared.types";

export type GitHubGraphQLTreeEntryCommitNode = {
  oid: string;
  message: string;
  committedDate: string;
  author: {
    user: {
      login: string;
      avatarUrl: string;
      url: string;
    } | null;
  } | null;
};

export type GitHubGraphQLTreeEntryCommitHistory = {
  nodes: GitHubGraphQLTreeEntryCommitNode[];
};

export type GitHubGraphQLTreeEntryCommitObject = Record<
  string,
  GitHubGraphQLTreeEntryCommitHistory
> | null;

export type GitHubGraphQLTreeEntryCommitsResponse = {
  repository: {
    object: GitHubGraphQLTreeEntryCommitObject;
  } | null;
  rateLimit: GitHubGraphQLRateLimit | null;
};
