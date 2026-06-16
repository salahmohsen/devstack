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

export const GitHubLocalFirstMetaSchema = z.object({
  cacheStatus: z.enum(["fresh", "stale", "miss"]),
  fetchedAt: z.number().nullable(),
  isRevalidating: z.boolean()
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
  url: z.string()
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
