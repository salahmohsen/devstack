export type GitHubApiActor = {
  avatar_url?: string | null;
  html_url?: string | null;
  login?: string;
  type?: string;
};

export type GitHubApiLabel = {
  color?: string | null;
  description?: string | null;
  name?: string | null;
};

export type GitHubRestIssue = {
  closed_at: string | null;
  comments: number;
  created_at: string;
  html_url: string;
  id: number;
  labels?: Array<string | GitHubApiLabel> | null;
  number: number;
  pull_request?: unknown;
  state: string;
  state_reason?: string | null;
  title: string;
  updated_at: string;
  user?: GitHubApiActor | null;
};
