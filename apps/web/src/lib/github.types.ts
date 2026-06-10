import { type GitHubLocalFirstMeta } from "@tsu-stack/github";

export type RepositoryRef = {
  name: string;
  owner: string;
  fullName: string;
  url: string;
  isPrivate: boolean | null;
};

export type GitHubActor = {
  login: string;
  avatarUrl: string;
  url: string;
  type: string;
};

export type UserRepoSummary = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  isPrivate: boolean;
  visibility: "public" | "private" | "internal";
  url: string;
  owner: string;
};

export type PullSummary = {
  id: number;
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  comments: number;
  url: string;
  author: GitHubActor | null;
  labels: { name: string; color: string; description: string | null }[];
  repository: RepositoryRef;
};

export type IssueSummary = {
  id: number;
  number: number;
  title: string;
  state: string;
  stateReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: number;
  url: string;
  author: GitHubActor | null;
  labels: { name: string; color: string; description: string | null }[];
  repository: RepositoryRef;
};

export type MyPullsResult = {
  reviewRequested: PullSummary[];
  assigned: PullSummary[];
  authored: PullSummary[];
  mentioned: PullSummary[];
  involved: PullSummary[];
  forbiddenOrgs?: string[];
  partial?: boolean;
  timedOut?: boolean;
  __meta?: GitHubLocalFirstMeta;
};

export type MyIssuesResult = {
  assigned: IssueSummary[];
  authored: IssueSummary[];
  mentioned: IssueSummary[];
  forbiddenOrgs?: string[];
  partial?: boolean;
  timedOut?: boolean;
  __meta?: GitHubLocalFirstMeta;
};

export type CommandPaletteSearchResult = {
  pulls: PullSummary[];
  issues: IssueSummary[];
};
