export type GitHubQueryScope = {
  userId: string;
};

export type PullFromRepoQueryInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type IssueFromRepoQueryInput = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export type ReposHubInput = {
  searchQuery: string;
  visibility: string[];
  sortId: string;
  limit: number;
};

export type PullsFromUserQueryInput = {
  username?: string;
  state?: string;
  page?: number;
  perPage?: number;
  role?: string;
  owner?: string;
  repo?: string;
};

export type IssuesFromUserQueryInput = {
  username?: string;
  state?: string;
  page?: number;
  perPage?: number;
  role?: string;
  owner?: string;
  repo?: string;
};

export type PullsFromRepoQueryInput = {
  owner: string;
  repo: string;
  state?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  direction?: "asc" | "desc";
};

export type IssuesFromRepoQueryInput = {
  owner: string;
  repo: string;
  state?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  direction?: "asc" | "desc";
};

export type WorkflowRunQueryInput = {
  owner: string;
  repo: string;
  runId: number;
};

export type WorkflowRunsFromRepoQueryInput = {
  owner: string;
  repo: string;
  page?: number;
  perPage?: number;
  status?: string;
  event?: string;
  branch?: string;
  actor?: string;
  workflowId?: number;
};

export type WorkflowDefinitionQueryInput = {
  owner: string;
  repo: string;
  path: string;
  ref: string;
};

export type WorkflowJobLogsQueryInput = {
  owner: string;
  repo: string;
  jobId: number;
};

export type WorkflowRunLogsBundleQueryInput = {
  owner: string;
  repo: string;
  runId: number;
  attempt?: number;
};

export const persistedMeta = {
  persist: true
} as const;

export const githubQueryKeys = {
  all: ["github"] as const,
  viewer: (scope: GitHubQueryScope) => ["github", scope.userId, "viewer"] as const,
  repos: {
    list: (scope: GitHubQueryScope) => ["github", scope.userId, "repos", "list"] as const,
    hub: (scope: GitHubQueryScope, input: ReposHubInput) =>
      ["github", scope.userId, "repos", "hub", input] as const
  },
  pulls: {
    mine: (scope: GitHubQueryScope) => ["github", scope.userId, "pulls", "mine"] as const,
    user: (scope: GitHubQueryScope, input: PullsFromUserQueryInput) =>
      ["github", scope.userId, "pulls", "user", input] as const,
    repo: (scope: GitHubQueryScope, input: PullsFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "repo", input] as const,
    page: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "page", input] as const,
    detail: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "detail", input] as const,
    fileSummaries: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "fileSummaries", input] as const,
    comments: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "comments", input] as const,
    status: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "status", input] as const,
    files: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "files", input] as const,
    reviewComments: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "reviewComments", input] as const,
    reviewThreads: (scope: GitHubQueryScope, input: PullFromRepoQueryInput) =>
      ["github", scope.userId, "pulls", "reviewThreads", input] as const
  },
  collaborators: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
    ["github", scope.userId, "collaborators", input] as const,
  repoLabels: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
    ["github", scope.userId, "repoLabels", input] as const,
  orgTeams: (scope: GitHubQueryScope, input: { org: string; owner: string; repo: string }) =>
    ["github", scope.userId, "orgTeams", input] as const,
  commentPage: (
    scope: GitHubQueryScope,
    input: { owner: string; repo: string; issueNumber: number; page: number }
  ) => ["github", scope.userId, "commentPage", input] as const,
  timelineEventPage: (
    scope: GitHubQueryScope,
    input: { owner: string; repo: string; issueNumber: number; page: number }
  ) => ["github", scope.userId, "timelineEventPage", input] as const,
  profile: (scope: GitHubQueryScope, username: string) =>
    ["github", scope.userId, "profile", username] as const,
  profileRepos: (scope: GitHubQueryScope, username: string) =>
    ["github", scope.userId, "profileRepos", username] as const,
  contributions: (scope: GitHubQueryScope, username: string) =>
    ["github", scope.userId, "contributions", username] as const,
  pinnedRepos: (scope: GitHubQueryScope, username: string) =>
    ["github", scope.userId, "pinnedRepos", username] as const,
  activity: (scope: GitHubQueryScope, username: string) =>
    ["github", scope.userId, "activity", username] as const,
  repo: {
    overview: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "overview", input] as const,
    branches: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "branches", input] as const,
    branchComparison: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; base: string; head: string }
    ) => ["github", scope.userId, "repo", "branchComparison", input] as const,
    compareDetail: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; base: string; head: string }
    ) => ["github", scope.userId, "repo", "compareDetail", input] as const,
    recentPushableBranch: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "recentPushableBranch", input] as const,
    tree: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; ref: string; path: string }
    ) => ["github", scope.userId, "repo", "tree", input] as const,
    fileContent: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; ref: string; path: string }
    ) => ["github", scope.userId, "repo", "fileContent", input] as const,
    fileLastCommit: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; ref: string; path: string }
    ) => ["github", scope.userId, "repo", "fileLastCommit", input] as const,
    commit: (scope: GitHubQueryScope, input: { owner: string; repo: string; sha: string }) =>
      ["github", scope.userId, "repo", "commit", input] as const,
    refHeadCommit: (scope: GitHubQueryScope, input: { owner: string; repo: string; ref: string }) =>
      ["github", scope.userId, "repo", "refHeadCommit", input] as const,
    treeEntryCommits: (
      scope: GitHubQueryScope,
      input: { owner: string; repo: string; ref: string; dirPath: string }
    ) => ["github", scope.userId, "repo", "treeEntryCommits", input] as const,
    contributors: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "contributors", input] as const,
    participation: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "participation", input] as const,
    discussions: (scope: GitHubQueryScope, input: { owner: string; repo: string }) =>
      ["github", scope.userId, "repo", "discussions", input] as const
  },
  issues: {
    mine: (scope: GitHubQueryScope) => ["github", scope.userId, "issues", "mine"] as const,
    user: (scope: GitHubQueryScope, input: IssuesFromUserQueryInput) =>
      ["github", scope.userId, "issues", "user", input] as const,
    repo: (scope: GitHubQueryScope, input: IssuesFromRepoQueryInput) =>
      ["github", scope.userId, "issues", "repo", input] as const,
    page: (scope: GitHubQueryScope, input: IssueFromRepoQueryInput) =>
      ["github", scope.userId, "issues", "page", input] as const,
    detail: (scope: GitHubQueryScope, input: IssueFromRepoQueryInput) =>
      ["github", scope.userId, "issues", "detail", input] as const,
    comments: (scope: GitHubQueryScope, input: IssueFromRepoQueryInput) =>
      ["github", scope.userId, "issues", "comments", input] as const
  },
  notifications: {
    list: (scope: GitHubQueryScope, input: { all?: boolean; participating?: boolean }) =>
      ["github", scope.userId, "notifications", "list", input] as const
  },
  actions: {
    runsList: (scope: GitHubQueryScope, input: WorkflowRunsFromRepoQueryInput) =>
      ["github", scope.userId, "actions", "runsList", input] as const,
    workflowRun: (scope: GitHubQueryScope, input: WorkflowRunQueryInput) =>
      ["github", scope.userId, "actions", "workflowRun", input] as const,
    workflowRunJobs: (scope: GitHubQueryScope, input: WorkflowRunQueryInput) =>
      ["github", scope.userId, "actions", "workflowRunJobs", input] as const,
    workflowRunArtifacts: (scope: GitHubQueryScope, input: WorkflowRunQueryInput) =>
      ["github", scope.userId, "actions", "workflowRunArtifacts", input] as const,
    workflowDefinition: (scope: GitHubQueryScope, input: WorkflowDefinitionQueryInput) =>
      ["github", scope.userId, "actions", "workflowDefinition", input] as const,
    workflowJobLogs: (scope: GitHubQueryScope, input: WorkflowJobLogsQueryInput) =>
      ["github", scope.userId, "actions", "workflowJobLogs", input] as const,
    workflowRunLogsBundle: (scope: GitHubQueryScope, input: WorkflowRunLogsBundleQueryInput) =>
      ["github", scope.userId, "actions", "workflowRunLogsBundle", input] as const
  }
};
