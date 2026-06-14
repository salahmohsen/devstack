import { z } from "zod";

import {
  getGitHubRevalidationSignals,
  getProfileRepos,
  getRepoActivityCards,
  getRepoBranchComparison,
  getRepoBranches,
  getRepoCommitSparkline,
  getRepoFileContent,
  getRepoOverview,
  getRepoRefCommit,
  getRepoTree,
  getTreeEntryCommits,
  getUserActivity,
  getUserContributions,
  getUserPinnedRepos,
  getUserProfile,
  resolvePublicGitHubSource
} from "@tsu-stack/github";

import { publicProcedure } from "#@/lib/procedures/factory";
import { GitHubUsernameSchema } from "#@/routers/app-settings/types";

const PublicGitHubStatusOutputSchema = z.object({
  isConfigured: z.boolean(),
  owner: GitHubUsernameSchema.nullable()
});

const PublicGitHubUserProfileOutputSchema = z.object({
  avatarUrl: z.url(),
  bio: z.string().nullable(),
  blog: z.url().nullable().or(z.string().nullable()),
  company: z.string().nullable(),
  createdAt: z.string(),
  followers: z.number().int(),
  following: z.number().int(),
  id: z.number().int(),
  location: z.string().nullable(),
  login: GitHubUsernameSchema,
  name: z.string().nullable(),
  publicRepos: z.number().int(),
  twitterUsername: z.string().nullable(),
  url: z.url()
});

const PublicGitHubContributionCalendarOutputSchema = z.object({
  totalContributions: z.number().int(),
  weeks: z.array(
    z.object({
      days: z.array(
        z.object({
          count: z.number().int(),
          date: z.string(),
          level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        })
      )
    })
  )
});

const PublicGitHubPinnedRepoOutputSchema = z.object({
  description: z.string().nullable(),
  forks: z.number().int(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  languageColor: z.string().nullable(),
  name: z.string(),
  owner: GitHubUsernameSchema,
  stars: z.number().int(),
  url: z.url()
});

const PublicGitHubRepoSummaryOutputSchema = z.object({
  createdAt: z.string(),
  defaultBranch: z.string(),
  description: z.string().nullable(),
  forkCount: z.number().int(),
  fullName: z.string(),
  id: z.number().int(),
  isFork: z.boolean(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  languageColor: z.string().nullable(),
  name: z.string(),
  owner: GitHubUsernameSchema,
  pushedAt: z.string().nullable(),
  stars: z.number().int(),
  updatedAt: z.string(),
  url: z.url(),
  visibility: z.enum(["internal", "private", "public"])
});

const PublicGitHubUserActivityOutputSchema = z.object({
  action: z.string().nullable(),
  actor: z
    .object({
      avatarUrl: z.url().nullable().or(z.string().nullable()),
      login: z.string().nullable()
    })
    .nullable(),
  commentBody: z.string().nullable().optional(),
  commits: z
    .array(
      z.object({
        message: z.string(),
        sha: z.string(),
        url: z.url().nullable().or(z.string().nullable())
      })
    )
    .nullable()
    .optional(),
  createdAt: z.string(),
  id: z.string(),
  issueDetail: z
    .object({
      number: z.number().int(),
      state: z.enum(["open", "closed"]),
      title: z.string(),
      url: z.url()
    })
    .nullable()
    .optional(),
  prDetail: z
    .object({
      number: z.number().int(),
      state: z.enum(["open", "closed", "merged"]),
      title: z.string(),
      url: z.url()
    })
    .nullable()
    .optional(),
  ref: z.string().nullable().optional(),
  refType: z.string().nullable().optional(),
  repo: z.object({
    name: z.string(),
    url: z.url()
  }),
  repoName: z.string(),
  title: z.string().nullable(),
  type: z.string(),
  url: z.url().nullable().or(z.string().nullable())
});

const PublicGitHubActorOutputSchema = z.object({
  login: z.string(),
  avatarUrl: z.string(),
  url: z.string(),
  type: z.string()
});

const GitHubLocalFirstMetaOutputSchema = z.object({
  cacheStatus: z.enum(["fresh", "stale", "miss"]),
  fetchedAt: z.number().int().nullable(),
  isRevalidating: z.boolean()
});

const PublicGitHubRepoOverviewOutputSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  isFork: z.boolean(),
  isPrivate: z.boolean(),
  viewerHasStarred: z.boolean(),
  defaultBranch: z.string(),
  stars: z.number().int(),
  forks: z.number().int(),
  watchers: z.number().int(),
  language: z.string().nullable(),
  license: z.string().nullable(),
  topics: z.array(z.string()),
  url: z.url(),
  owner: GitHubUsernameSchema,
  ownerAvatarUrl: z.url(),
  branchCount: z.number().int(),
  tagCount: z.number().int(),
  openPullCount: z.number().int(),
  openIssueCount: z.number().int(),
  hasDiscussions: z.boolean(),
  forkParentFullName: z.string().nullable(),
  forkParentOwnerAvatarUrl: z.url().nullable().or(z.string().nullable()),
  latestCommit: z
    .object({
      sha: z.string(),
      message: z.string(),
      date: z.string(),
      author: PublicGitHubActorOutputSchema.nullable()
    })
    .nullable(),
  __meta: GitHubLocalFirstMetaOutputSchema.optional()
});

const PublicGitHubRepoBranchOutputSchema = z.object({
  committedAt: z.string().nullable(),
  isDefault: z.boolean(),
  name: z.string(),
  sha: z.string().nullable(),
  url: z.url().nullable().or(z.string().nullable())
});

const PublicGitHubRepoTreeEntryOutputSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().int().nullable(),
  type: z.enum(["dir", "file", "submodule"])
});

const PublicGitHubTreeEntryCommitOutputSchema = z.object({
  sha: z.string(),
  message: z.string(),
  date: z.string(),
  author: PublicGitHubActorOutputSchema.nullable()
});

const PublicGitHubRepoCommitSparklineOutputSchema = z.object({
  weeklyCommits: z.array(z.number().int())
});

const PublicGitHubRepoActivityCardsOutputSchema = z.object({
  actions: z.array(
    z.object({
      conclusion: z.string().nullable(),
      id: z.number().int(),
      name: z.string(),
      startedAt: z.string().nullable(),
      status: z.string(),
      url: z.url().nullable().or(z.string().nullable())
    })
  ),
  issues: z.array(
    z.object({
      comments: z.number().int(),
      number: z.number().int(),
      state: z.enum(["open", "closed"]),
      title: z.string(),
      updatedAt: z.string(),
      url: z.url()
    })
  ),
  openIssuesCount: z.number().int(),
  openPullRequestsCount: z.number().int(),
  pullRequests: z.array(
    z.object({
      comments: z.number().int(),
      number: z.number().int(),
      state: z.enum(["open", "closed", "merged"]),
      title: z.string(),
      updatedAt: z.string(),
      url: z.url()
    })
  )
});

const UserActivityInputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

const RepoInputSchema = z.object({
  repo: z.string().trim().min(1)
});

const RepoBranchComparisonInputSchema = RepoInputSchema.extend({
  base: z.string().trim().min(1),
  head: z.string().trim().min(1)
});

const PublicGitHubRepoBranchComparisonOutputSchema = z.object({
  aheadBy: z.number().int(),
  behindBy: z.number().int()
});

const RepoTreeInputSchema = RepoInputSchema.extend({
  path: z.string().default(""),
  ref: z.string().trim().min(1)
});

const RepoFileContentInputSchema = RepoTreeInputSchema;

const RepoRefCommitInputSchema = RepoInputSchema.extend({
  ref: z.string().trim().min(1)
});

const PublicGitHubRepoLatestCommitOutputSchema = z.object({
  authorAvatarUrl: z.url().nullable().or(z.string().nullable()),
  authorLogin: z.string().nullable(),
  committedAt: z.string().nullable(),
  message: z.string().nullable(),
  sha: z.string().nullable(),
  url: z.url().nullable().or(z.string().nullable())
});

const RepoTreeEntryCommitsInputSchema = RepoInputSchema.extend({
  dirPath: z.string().default(""),
  entries: z.array(z.string().trim().min(1)).max(50),
  ref: z.string().trim().min(1)
});

const RevalidationSignalsOutputSchema = z.array(
  z.object({
    signalKey: z.string(),
    updatedAt: z.number()
  })
);

export const publicGitHubRouter = {
  getRevalidationSignals: publicProcedure
    .route({ description: "Get revalidation signal timestamps", method: "GET" })
    .input(z.object({ signalKeys: z.array(z.string()) }))
    .output(RevalidationSignalsOutputSchema)
    .handler(async ({ input }) => getGitHubRevalidationSignals(input.signalKeys)),
  getProfileRepos: publicProcedure
    .route({
      description: "Get the public repository list for a GitHub user",
      method: "GET"
    })
    .output(z.array(PublicGitHubRepoSummaryOutputSchema))
    .handler(async ({ context }) => getProfileRepos(context)),
  getRepoActivityCards: publicProcedure
    .route({
      description: "Get public repository activity cards for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(PublicGitHubRepoActivityCardsOutputSchema)
    .handler(async ({ context, input }) => getRepoActivityCards(input, context)),
  getRepoBranchComparison: publicProcedure
    .route({
      description: "Get commit comparison between two branches for a public GitHub repository",
      method: "GET"
    })
    .input(RepoBranchComparisonInputSchema)
    .output(PublicGitHubRepoBranchComparisonOutputSchema.nullable())
    .handler(async ({ context, input }) => getRepoBranchComparison(input, context)),
  getRepoBranches: publicProcedure
    .route({
      description: "Get the public branches for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(z.array(PublicGitHubRepoBranchOutputSchema))
    .handler(async ({ context, input }) => getRepoBranches(input, context)),
  getRepoCommitSparkline: publicProcedure
    .route({
      description: "Get public commit sparkline data for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(PublicGitHubRepoCommitSparklineOutputSchema)
    .handler(async ({ context, input }) => getRepoCommitSparkline(input, context)),
  getRepoFileContent: publicProcedure
    .route({
      description: "Get public file content for a GitHub repository path",
      method: "GET"
    })
    .input(RepoFileContentInputSchema)
    .output(z.string().nullable())
    .handler(async ({ context, input }) => getRepoFileContent(input, context)),
  getRefCommit: publicProcedure
    .route({
      description: "Get the latest commit for a specific ref in a public GitHub repository",
      method: "GET"
    })
    .input(RepoRefCommitInputSchema)
    .output(PublicGitHubRepoLatestCommitOutputSchema.nullable())
    .handler(async ({ context, input }) => getRepoRefCommit(input, context)),
  getRepoOverview: publicProcedure
    .route({
      description: "Get the public overview for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(PublicGitHubRepoOverviewOutputSchema.nullable())
    .handler(async ({ input, context }) => getRepoOverview(input, context)),
  getRepoTree: publicProcedure
    .route({
      description: "Get public directory entries for a GitHub repository path",
      method: "GET"
    })
    .input(RepoTreeInputSchema)
    .output(z.array(PublicGitHubRepoTreeEntryOutputSchema))
    .handler(async ({ context, input }) => getRepoTree(input, context)),
  getTreeEntryCommits: publicProcedure
    .route({
      description: "Get latest commits for public repository tree entries",
      method: "GET"
    })
    .input(RepoTreeEntryCommitsInputSchema)
    .output(z.record(z.string(), PublicGitHubTreeEntryCommitOutputSchema.nullable()))
    .handler(async ({ context, input }) => getTreeEntryCommits(input, context)),
  getSetupStatus: publicProcedure
    .route({
      description: "Get the public GitHub setup status for this app",
      method: "GET"
    })
    .output(PublicGitHubStatusOutputSchema)
    .handler(async () => {
      const source = await resolvePublicGitHubSource();
      return {
        isConfigured: source.isConfigured,
        owner: source.isConfigured ? source.owner : null
      };
    }),
  getUserActivity: publicProcedure
    .route({
      description: "Get public GitHub activity for a user",
      method: "GET"
    })
    .input(UserActivityInputSchema)
    .output(z.array(PublicGitHubUserActivityOutputSchema))
    .handler(async ({ context, input }) => getUserActivity(input, context)),
  getUserContributions: publicProcedure
    .route({
      description: "Get the public GitHub contribution calendar for a user",
      method: "GET"
    })
    .output(PublicGitHubContributionCalendarOutputSchema.nullable())
    .handler(async ({ context }) => getUserContributions(context)),
  getUserPinnedRepos: publicProcedure
    .route({
      description: "Get the pinned public GitHub repositories for a user",
      method: "GET"
    })
    .output(z.array(PublicGitHubPinnedRepoOutputSchema))
    .handler(async ({ context }) => getUserPinnedRepos(context)),
  getUserProfile: publicProcedure
    .route({
      description: "Get the public GitHub profile for a user",
      method: "GET"
    })
    .output(PublicGitHubUserProfileOutputSchema.nullable())
    .handler(async ({ context }) => getUserProfile(context))
};
