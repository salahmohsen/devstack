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

export type GitHubRestPull = {
  closed_at: string | null;
  comments?: number;
  created_at: string;
  draft?: boolean;
  html_url: string;
  id: number;
  labels?: Array<string | GitHubApiLabel> | null;
  merged_at?: string | null;
  number: number;
  state: string;
  title: string;
  updated_at: string;
  user?: GitHubApiActor | null;
};
