export type GitHubContributionDay = {
  count: number;
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
};

export type GitHubContributionWeek = {
  days: GitHubContributionDay[];
};

export type GitHubContributionCalendar = {
  totalContributions: number;
  weeks: GitHubContributionWeek[];
};

export type GitHubPinnedRepo = {
  description: string | null;
  forks: number;
  fullName?: string;
  isPrivate: boolean;
  language: string | null;
  languageColor: string | null;
  name: string;
  owner: string;
  stars: number;
  url: string;
};

export type GitHubUserActivityEvent = {
  action: string | null;
  actor: {
    avatarUrl: string | null;
    login: string | null;
  } | null;
  commentBody?: string | null;
  commits?: Array<{
    message: string;
    sha: string;
    url: string | null;
  }> | null;
  createdAt: string;
  id: string;
  issueDetail?: {
    number: number;
    state: "open" | "closed";
    title: string;
    url: string;
  } | null;
  prDetail?: {
    number: number;
    state: "open" | "closed" | "merged";
    title: string;
    url: string;
  } | null;
  ref?: string | null;
  refType?: string | null;
  repo: {
    name: string;
    url: string;
  };
  repoName: string;
  title: string | null;
  type: string;
  url: string | null;
};

export type GitHubUserProfile = {
  avatarUrl: string;
  bio: string | null;
  blog: string | null;
  company: string | null;
  createdAt: string;
  followers: number;
  following: number;
  id: number;
  location: string | null;
  login: string;
  name: string | null;
  publicRepos: number;
  twitterUsername: string | null;
  url: string;
};

export type GitHubUserRepoSummary = {
  createdAt: string;
  defaultBranch: string;
  description: string | null;
  forkCount: number;
  forks: number;
  fullName: string;
  id: number;
  isFork: boolean;
  isPrivate: boolean;
  language: string | null;
  languageColor: string | null;
  name: string;
  owner: string;
  pushedAt: string | null;
  stars: number;
  updatedAt: string;
  url: string;
  visibility: "internal" | "private" | "public";
};

export type GitHubRepoLatestCommit = {
  authorAvatarUrl: string | null;
  authorLogin: string | null;
  committedAt: string | null;
  message: string | null;
  sha: string | null;
  url: string | null;
};

export type GitHubRepoBranch = {
  committedAt: string | null;
  isDefault: boolean;
  name: string;
  sha: string | null;
  url: string | null;
};

export type GitHubRepoTreeEntry = {
  name: string;
  path: string;
  sha: string;
  size: number | null;
  type: "dir" | "file" | "submodule";
};

export type GitHubActor = {
  login: string;
  avatarUrl: string;
  url: string;
  type: string;
};

export type GitHubTreeEntryCommit = {
  sha: string;
  message: string;
  date: string;
  author: GitHubActor | null;
};

export type GitHubRepoBranchComparison = {
  aheadBy: number;
  behindBy: number;
};

export type GitHubRepoCommitSparkline = {
  weeklyCommits: number[];
};

export type GitHubRepoActivityCardPullRequest = {
  comments: number;
  number: number;
  state: "open" | "closed" | "merged";
  title: string;
  updatedAt: string;
  url: string;
};

export type GitHubRepoActivityCardIssue = {
  comments: number;
  number: number;
  state: "open" | "closed";
  title: string;
  updatedAt: string;
  url: string;
};

export type GitHubRepoActivityCardAction = {
  conclusion: string | null;
  id: number;
  name: string;
  startedAt: string | null;
  status: string;
  url: string | null;
};

export type GitHubRepoActivityCards = {
  actions: GitHubRepoActivityCardAction[];
  issues: GitHubRepoActivityCardIssue[];
  openIssuesCount: number;
  openPullRequestsCount: number;
  pullRequests: GitHubRepoActivityCardPullRequest[];
};

export type GitHubLocalFirstMeta = {
  cacheStatus: "fresh" | "miss" | "stale";
  fetchedAt: string | null;
  isRevalidating: boolean;
};

export type UserRepoSummary = GitHubUserRepoSummary;

export type GitHubLocalFirstResult<TData> = {
  data: TData;
  meta: GitHubLocalFirstMeta;
};
