import { type GitHubGraphQLRateLimit } from "#@/repo/shared.types";

export type GitHubGraphQLRepoOverviewResponse = {
  repository: {
    databaseId: number | null;
    name: string;
    nameWithOwner: string;
    description: string | null;
    isPrivate: boolean;
    isFork: boolean;
    defaultBranchRef: {
      name: string;
      target: {
        __typename: string;
        oid?: string;
        message?: string;
        committedDate?: string;
        author?: {
          user?: {
            login: string;
            avatarUrl: string;
            url: string;
          } | null;
        } | null;
      } | null;
    } | null;
    stargazerCount: number;
    forkCount: number;
    watchers: {
      totalCount: number;
    };
    primaryLanguage: {
      name: string;
    } | null;
    licenseInfo: {
      spdxId: string | null;
    } | null;
    repositoryTopics: {
      nodes: Array<{
        topic: {
          name: string;
        };
      } | null> | null;
    };
    url: string;
    owner: {
      login: string;
      avatarUrl: string;
    };
    branches: {
      totalCount: number;
    };
    tags: {
      totalCount: number;
    };
    pullRequests: {
      totalCount: number;
    };
    issues: {
      totalCount: number;
    };
    hasDiscussionsEnabled: boolean;
    parent: {
      nameWithOwner: string;
      owner: {
        avatarUrl: string;
      };
    } | null;
  } | null;
  rateLimit: GitHubGraphQLRateLimit;
};

export type GitHubGraphQLActor = {
  login: string;
  avatarUrl: string;
  url: string;
  __typename?: string;
} | null;
