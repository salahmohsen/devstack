export type GitHubApiActor = {
  avatar_url?: string | null;
  html_url?: string | null;
  login?: string;
  type?: string;
};

export type GitHubWorkflowRunRaw = {
  actor?: GitHubApiActor | null;
  conclusion: string | null;
  created_at: string;
  display_title?: string | null;
  event: string;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  id: number;
  name?: string | null;
  path: string;
  pull_requests?: Array<{
    base?: { ref?: string };
    head?: { ref?: string };
    number: number;
  }> | null;
  run_attempt?: number;
  run_number: number;
  run_started_at?: string | null;
  status: string;
  triggering_actor?: GitHubApiActor | null;
  updated_at: string;
  workflow_id: number;
};
