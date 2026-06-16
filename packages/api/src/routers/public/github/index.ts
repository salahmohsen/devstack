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
  getUserProfile
} from "@tsu-stack/github";
import {
  GitHubContributionCalendarSchema,
  GitHubPinnedRepoSchema,
  GitHubRepoActivityCardsSchema,
  GitHubRepoBranchComparisonSchema,
  GitHubRepoBranchSchema,
  GitHubRepoCommitSparklineSchema,
  GitHubRepoLatestCommitSchema,
  GitHubRepoTreeEntrySchema,
  GitHubTreeEntryCommitSchema,
  GitHubUserActivityEventSchema,
  GitHubUserProfileSchema,
  GitHubUserRepoSummarySchema,
  RepoOverviewSchema
} from "@tsu-stack/github/schemas";

import { publicProcedure } from "#@/lib/procedures/factory";
import { GitHubUsernameSchema } from "#@/routers/app-settings/types";

const PublicGitHubStatusOutputSchema = z.object({
  isConfigured: z.boolean(),
  owner: GitHubUsernameSchema.nullable()
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

const RepoTreeInputSchema = RepoInputSchema.extend({
  path: z.string().default(""),
  ref: z.string().trim().min(1)
});

const RepoFileContentInputSchema = RepoTreeInputSchema;

const RepoRefCommitInputSchema = RepoInputSchema.extend({
  ref: z.string().trim().min(1)
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
    .output(z.array(GitHubUserRepoSummarySchema))
    .handler(async ({ context }) => getProfileRepos(context)),
  getRepoActivityCards: publicProcedure
    .route({
      description: "Get public repository activity cards for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoActivityCardsSchema)
    .handler(async ({ context, input }) => getRepoActivityCards(input, context)),
  getRepoBranchComparison: publicProcedure
    .route({
      description: "Get commit comparison between two branches for a public GitHub repository",
      method: "GET"
    })
    .input(RepoBranchComparisonInputSchema)
    .output(GitHubRepoBranchComparisonSchema.nullable())
    .handler(async ({ context, input }) => getRepoBranchComparison(input, context)),
  getRepoBranches: publicProcedure
    .route({
      description: "Get the public branches for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(z.array(GitHubRepoBranchSchema))
    .handler(async ({ context, input }) => getRepoBranches(input, context)),
  getRepoCommitSparkline: publicProcedure
    .route({
      description: "Get public commit sparkline data for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoCommitSparklineSchema)
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
    .output(GitHubRepoLatestCommitSchema.nullable())
    .handler(async ({ context, input }) => getRepoRefCommit(input, context)),
  getRepoOverview: publicProcedure
    .route({
      description: "Get the public overview for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(RepoOverviewSchema.nullable())
    .handler(async ({ input, context }) => getRepoOverview(input, context)),
  getRepoTree: publicProcedure
    .route({
      description: "Get public directory entries for a GitHub repository path",
      method: "GET"
    })
    .input(RepoTreeInputSchema)
    .output(z.array(GitHubRepoTreeEntrySchema))
    .handler(async ({ context, input }) => getRepoTree(input, context)),
  getTreeEntryCommits: publicProcedure
    .route({
      description: "Get latest commits for public repository tree entries",
      method: "GET"
    })
    .input(RepoTreeEntryCommitsInputSchema)
    .output(z.record(z.string(), GitHubTreeEntryCommitSchema.nullable()))
    .handler(async ({ context, input }) => getTreeEntryCommits(input, context)),
  getSetupStatus: publicProcedure
    .route({
      description: "Get the public GitHub setup status for this app",
      method: "GET"
    })
    .output(PublicGitHubStatusOutputSchema)
    .handler(async ({ context }) => {
      const source = context.github.source;
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
    .output(z.array(GitHubUserActivityEventSchema))
    .handler(async ({ context, input }) => getUserActivity(input, context)),
  getUserContributions: publicProcedure
    .route({
      description: "Get the public GitHub contribution calendar for a user",
      method: "GET"
    })
    .output(GitHubContributionCalendarSchema.nullable())
    .handler(async ({ context }) => getUserContributions(context)),
  getUserPinnedRepos: publicProcedure
    .route({
      description: "Get the pinned public GitHub repositories for a user",
      method: "GET"
    })
    .output(z.array(GitHubPinnedRepoSchema))
    .handler(async ({ context }) => getUserPinnedRepos(context)),
  getUserProfile: publicProcedure
    .route({
      description: "Get the public GitHub profile for a user",
      method: "GET"
    })
    .output(GitHubUserProfileSchema.nullable())
    .handler(async ({ context }) => getUserProfile(context))
};
