import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

export const GitHubActorSchema = z.object({
  login: z.string(),
  avatarUrl: z.string(),
  url: z.string(),
  type: z.string()
});
export type GitHubActor = z.infer<typeof GitHubActorSchema>;

export const GitHubDataSourceSchema = z.enum([
  "kv",
  "db",
  "octokit",
  "not-modified",
  "rate-limited",
  "stale-on-error"
]);
export type GitHubDataSource = z.infer<typeof GitHubDataSourceSchema>;

export const GitHubLocalFirstMetaSchema = z.object({
  cacheStatus: z.enum(["fresh", "stale", "miss"]),
  fetchedAt: z.number().nullable(),
  isRevalidating: z.boolean(),
  source: GitHubDataSourceSchema
});
export type GitHubLocalFirstMeta = z.infer<typeof GitHubLocalFirstMetaSchema>;

// ---------------------------------------------------------------------------
// User domain
// ---------------------------------------------------------------------------

export const GitHubContributionDaySchema = z.object({
  count: z.number(),
  date: z.string(),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
});
export type GitHubContributionDay = z.infer<typeof GitHubContributionDaySchema>;

export const GitHubContributionWeekSchema = z.object({
  days: z.array(GitHubContributionDaySchema)
});
export type GitHubContributionWeek = z.infer<typeof GitHubContributionWeekSchema>;

export const GitHubContributionCalendarSchema = z.object({
  totalContributions: z.number(),
  weeks: z.array(GitHubContributionWeekSchema)
});
export type GitHubContributionCalendar = z.infer<typeof GitHubContributionCalendarSchema>;

export const GitHubPinnedRepoSchema = z.object({
  description: z.string().nullable(),
  forks: z.number(),
  fullName: z.string().optional(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  languageColor: z.string().nullable(),
  name: z.string(),
  owner: z.string(),
  stars: z.number(),
  url: z.string()
});
export type GitHubPinnedRepo = z.infer<typeof GitHubPinnedRepoSchema>;

export const GitHubUserActivityEventSchema = z.object({
  action: z.string().nullable(),
  actor: z
    .object({
      avatarUrl: z.string().nullable(),
      login: z.string().nullable()
    })
    .nullable(),
  commentBody: z.string().nullable().optional(),
  commits: z
    .array(
      z.object({
        message: z.string(),
        sha: z.string(),
        url: z.string().nullable()
      })
    )
    .nullable()
    .optional(),
  createdAt: z.string(),
  id: z.string(),
  issueDetail: z
    .object({
      number: z.number(),
      state: z.enum(["open", "closed"]),
      title: z.string(),
      url: z.string()
    })
    .nullable()
    .optional(),
  prDetail: z
    .object({
      number: z.number(),
      state: z.enum(["open", "closed", "merged"]),
      title: z.string(),
      url: z.string()
    })
    .nullable()
    .optional(),
  ref: z.string().nullable().optional(),
  refType: z.string().nullable().optional(),
  repo: z.object({
    name: z.string(),
    url: z.string()
  }),
  repoName: z.string(),
  title: z.string().nullable(),
  type: z.string(),
  url: z.string().nullable()
});
export type GitHubUserActivityEvent = z.infer<typeof GitHubUserActivityEventSchema>;

export const GitHubUserProfileSchema = z.object({
  avatarUrl: z.string(),
  bio: z.string().nullable(),
  blog: z.string().nullable(),
  company: z.string().nullable(),
  createdAt: z.string(),
  followers: z.number(),
  following: z.number(),
  id: z.number(),
  location: z.string().nullable(),
  login: z.string(),
  name: z.string().nullable(),
  publicRepos: z.number(),
  twitterUsername: z.string().nullable(),
  url: z.string()
});
export type GitHubUserProfile = z.infer<typeof GitHubUserProfileSchema>;

export const GitHubUserRepoSummarySchema = z.object({
  createdAt: z.string(),
  defaultBranch: z.string(),
  description: z.string().nullable(),
  forks: z.number(),
  fullName: z.string(),
  id: z.number(),
  isFork: z.boolean(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  languageColor: z.string().nullable(),
  name: z.string(),
  owner: z.string(),
  pushedAt: z.string().nullable(),
  stars: z.number(),
  updatedAt: z.string(),
  url: z.string(),
  visibility: z.enum(["internal", "private", "public"])
});
export type GitHubUserRepoSummary = z.infer<typeof GitHubUserRepoSummarySchema>;

// ---------------------------------------------------------------------------
// Repo domain
// ---------------------------------------------------------------------------

export const GitHubRepoBranchSchema = z.object({
  committedAt: z.string().nullable(),
  isDefault: z.boolean(),
  name: z.string(),
  sha: z.string().nullable(),
  url: z.string().nullable()
});
export type GitHubRepoBranch = z.infer<typeof GitHubRepoBranchSchema>;

export const GitHubRepoBranchComparisonSchema = z.object({
  aheadBy: z.number(),
  behindBy: z.number()
});
export type GitHubRepoBranchComparison = z.infer<typeof GitHubRepoBranchComparisonSchema>;

export const GitHubRepoCommitSparklineSchema = z.object({
  weeklyCommits: z.array(z.number())
});
export type GitHubRepoCommitSparkline = z.infer<typeof GitHubRepoCommitSparklineSchema>;

export const GitHubRepoLatestCommitSchema = z.object({
  authorAvatarUrl: z.string().nullable(),
  authorLogin: z.string().nullable(),
  committedAt: z.string().nullable(),
  message: z.string().nullable(),
  sha: z.string().nullable(),
  url: z.string().nullable()
});
export type GitHubRepoLatestCommit = z.infer<typeof GitHubRepoLatestCommitSchema>;

export const RepoRecentCommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  authorLogin: z.string().nullable(),
  date: z.coerce.date()
});
export type RepoRecentCommit = z.infer<typeof RepoRecentCommitSchema>;

export const GitHubRepoTreeEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().nullable(),
  type: z.enum(["dir", "file", "submodule"])
});
export type GitHubRepoTreeEntry = z.infer<typeof GitHubRepoTreeEntrySchema>;

export const GitHubTreeEntryCommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  date: z.string(),
  author: GitHubActorSchema.nullable()
});
export type GitHubTreeEntryCommit = z.infer<typeof GitHubTreeEntryCommitSchema>;

// ---------------------------------------------------------------------------
// Repo activity cards
// ---------------------------------------------------------------------------

export const GitHubRepoActivityCardActionSchema = z.object({
  conclusion: z.string().nullable(),
  id: z.number(),
  name: z.string(),
  startedAt: z.string().nullable(),
  status: z.string(),
  url: z.string().nullable()
});
export type GitHubRepoActivityCardAction = z.infer<typeof GitHubRepoActivityCardActionSchema>;

export const GitHubRepoActivityCardIssueSchema = z.object({
  id: z.number,
  comments: z.number(),
  number: z.number(),
  state: z.enum(["open", "closed"]),
  title: z.string(),
  updatedAt: z.string(),
  url: z.string()
});
export type GitHubRepoActivityCardIssue = z.infer<typeof GitHubRepoActivityCardIssueSchema>;

export const GitHubRepoActivityCardPullRequestSchema = z.object({
  comments: z.number(),
  number: z.number(),
  state: z.enum(["open", "closed", "merged"]),
  title: z.string(),
  updatedAt: z.string(),
  url: z.string(),
  id: z.number()
});
export type GitHubRepoActivityCardPullRequest = z.infer<
  typeof GitHubRepoActivityCardPullRequestSchema
>;

export const GitHubRepoActivityCardsSchema = z.object({
  actions: z.array(GitHubRepoActivityCardActionSchema),
  issues: z.array(GitHubRepoActivityCardIssueSchema),
  openIssuesCount: z.number(),
  openPullRequestsCount: z.number(),
  pullRequests: z.array(GitHubRepoActivityCardPullRequestSchema)
});
export type GitHubRepoActivityCards = z.infer<typeof GitHubRepoActivityCardsSchema>;

// ---------------------------------------------------------------------------
// Pull / Issue / Discussion / WorkflowRun (shared repo activity types)
// ---------------------------------------------------------------------------

export const RepositoryRefSchema = z.object({
  fullName: z.string(),
  isPrivate: z.boolean().nullable(),
  name: z.string(),
  owner: z.string(),
  url: z.string()
});
export type RepositoryRef = z.infer<typeof RepositoryRefSchema>;

export const GitHubLabelSchema = z.object({
  color: z.string(),
  description: z.string().nullable(),
  name: z.string()
});
export type GitHubLabel = z.infer<typeof GitHubLabelSchema>;

export const GitHubPullSummarySchema = z.object({
  author: GitHubActorSchema.nullable(),
  closedAt: z.string().nullable(),
  comments: z.number(),
  createdAt: z.string(),
  id: z.number(),
  isDraft: z.boolean(),
  labels: z.array(GitHubLabelSchema),
  mergedAt: z.string().nullable(),
  number: z.number(),
  repository: RepositoryRefSchema,
  state: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  url: z.string()
});
export type GitHubPullSummary = z.infer<typeof GitHubPullSummarySchema>;

export const GitHubIssueSummarySchema = z.object({
  author: GitHubActorSchema.nullable(),
  closedAt: z.string().nullable(),
  comments: z.number(),
  createdAt: z.string(),
  id: z.number(),
  labels: z.array(GitHubLabelSchema),
  number: z.number(),
  repository: RepositoryRefSchema,
  state: z.string(),
  stateReason: z.string().nullable(),
  title: z.string(),
  updatedAt: z.string(),
  url: z.string()
});
export type GitHubIssueSummary = z.infer<typeof GitHubIssueSummarySchema>;

export const GitHubWorkflowRunPullRequestRefSchema = z.object({
  baseRef: z.string(),
  headRef: z.string(),
  number: z.number()
});
export type GitHubWorkflowRunPullRequestRef = z.infer<typeof GitHubWorkflowRunPullRequestRefSchema>;

export const GitHubWorkflowRunSchema = z.object({
  actor: GitHubActorSchema.nullable(),
  conclusion: z.string().nullable(),
  createdAt: z.string(),
  displayTitle: z.string(),
  event: z.string(),
  headBranch: z.string().nullable(),
  headSha: z.string(),
  htmlUrl: z.string(),
  id: z.number(),
  name: z.string().nullable(),
  path: z.string(),
  pullRequests: z.array(GitHubWorkflowRunPullRequestRefSchema),
  runAttempt: z.number(),
  runNumber: z.number(),
  runStartedAt: z.string().nullable(),
  status: z.string(),
  triggeringActor: GitHubActorSchema.nullable(),
  updatedAt: z.string(),
  viewerCanRerun: z.boolean(),
  workflowId: z.number()
});
export type GitHubWorkflowRun = z.infer<typeof GitHubWorkflowRunSchema>;

export const GitHubDiscussionSummarySchema = z.object({
  author: z
    .object({
      avatarUrl: z.string(),
      login: z.string()
    })
    .nullable(),
  category: z.string().nullable(),
  comments: z.number(),
  createdAt: z.string(),
  isAnswered: z.boolean(),
  number: z.number(),
  title: z.string(),
  updatedAt: z.string(),
  url: z.string()
});
export type GitHubDiscussionSummary = z.infer<typeof GitHubDiscussionSummarySchema>;

export const GitHubDiscussionsResultSchema = z.object({
  discussions: z.array(GitHubDiscussionSummarySchema),
  totalCount: z.number()
});
export type GitHubDiscussionsResult = z.infer<typeof GitHubDiscussionsResultSchema>;

// ---------------------------------------------------------------------------
// Repo overview
// ---------------------------------------------------------------------------

export const RepoOverviewSchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  isPrivate: z.boolean(),
  isFork: z.boolean(),
  viewerHasStarred: z.boolean(),
  defaultBranch: z.string(),
  stars: z.number(),
  forks: z.number(),
  watchers: z.number(),
  language: z.string().nullable(),
  license: z.string().nullable(),
  topics: z.array(z.string()),
  url: z.string(),
  owner: z.string(),
  ownerAvatarUrl: z.string(),
  branchCount: z.number(),
  tagCount: z.number(),
  openPullCount: z.number(),
  openIssueCount: z.number(),
  hasDiscussions: z.boolean(),
  forkParentFullName: z.string().nullable(),
  forkParentOwnerAvatarUrl: z.string().nullable(),
  latestCommit: z
    .object({
      sha: z.string(),
      message: z.string(),
      date: z.string(),
      author: GitHubActorSchema.nullable()
    })
    .nullable(),
  __meta: GitHubLocalFirstMetaSchema.optional()
});
export type RepoOverview = z.infer<typeof RepoOverviewSchema>;

// ---------------------------------------------------------------------------
// Repo contributors
// ---------------------------------------------------------------------------

export const RepoContributorSchema = z.object({
  login: z.string(),
  avatarUrl: z.string(),
  contributions: z.number()
});
export type RepoContributor = z.infer<typeof RepoContributorSchema>;

export const RepoContributorsResultSchema = z.object({
  contributors: z.array(RepoContributorSchema),
  totalCount: z.number()
});
export type RepoContributorsResult = z.infer<typeof RepoContributorsResultSchema>;
