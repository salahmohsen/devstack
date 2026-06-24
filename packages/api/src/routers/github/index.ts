import { z } from "zod";

import { GitHubUsernameSchema } from "@tsu-stack/core/github-config";
import {
  bumpGitHubCacheNamespaces,
  getGitHubRevalidationSignals,
  getPrivateProfileRepos,
  getPrivateRepoActivityCards,
  getPrivateRepoBranchComparison,
  getPrivateRepoBranches,
  getPrivateRepoCommitSparkline,
  getPrivateRepoContributors,
  getPrivateRepoFileContent,
  getPrivateRepoOverview,
  getPrivateRepoRefCommit,
  getPrivateRepoTree,
  getPrivateTreeEntryCommits,
  getPrivateUserActivity,
  getPrivateUserContributions,
  getPrivateUserPinnedRepos,
  getPrivateUserProfile,
  getProfileRepos,
  getRepoActivityCards,
  getRepoBranchComparison,
  getRepoBranches,
  getRepoCommitSparkline,
  getRepoContributors,
  getRepoFileContent,
  getRepoOverview,
  getRepoRefCommit,
  getRepoTree,
  getTreeEntryCommits,
  getUserActivity,
  getUserContributions,
  getUserPinnedRepos,
  getUserProfile,
  markGitHubRevalidationSignals
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
  RepoContributorsResultSchema,
  RepoOverviewSchema
} from "@tsu-stack/github/schemas";

import { ownerProcedure, protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

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

const RevalidationResultSchema = z.object({
  ok: z.boolean()
});

export const githubRouter = {
  getRevalidationSignals: publicProcedure
    .route({ description: "Get revalidation signal timestamps", method: "GET" })
    .input(z.object({ signalKeys: z.array(z.string()) }))
    .output(RevalidationSignalsOutputSchema)
    .handler(async ({ input }) => getGitHubRevalidationSignals(input.signalKeys)),
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
  refreshInstallationAccess: protectedProcedure
    .route({ description: "Refresh installation access cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await markGitHubRevalidationSignals(["installationAccess"]);
      return { ok: true };
    }),
  clearViewerCache: protectedProcedure
    .route({ description: "Clear viewer's GitHub cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await markGitHubRevalidationSignals([
        "installationAccess",
        "pulls.mine",
        "issues.mine",
        "notifications"
      ]);
      await bumpGitHubCacheNamespaces([
        "repos.list",
        "pulls.authored",
        "pulls.assigned",
        "pulls.reviewRequested",
        "pulls.mentioned",
        "pulls.involved",
        "issues.authored",
        "issues.assigned",
        "issues.mentioned"
      ]);
      return { ok: true };
    }),
  publicGetProfileRepos: publicProcedure
    .route({
      description: "Get the public repository list for a GitHub user",
      method: "GET"
    })
    .output(z.array(GitHubUserRepoSummarySchema))
    .handler(async ({ context }) => getProfileRepos(context)),
  privateGetProfileRepos: ownerProcedure
    .route({
      description: "Get the owner's full repository list, including private repos",
      method: "GET"
    })
    .output(z.array(GitHubUserRepoSummarySchema))
    .handler(async ({ context }) => getPrivateProfileRepos(context)),
  publicGetRepoActivityCards: publicProcedure
    .route({
      description: "Get public repository activity cards for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoActivityCardsSchema)
    .handler(async ({ context, input }) => getRepoActivityCards(input, context)),
  privateGetRepoActivityCards: ownerProcedure
    .route({
      description: "Get repository activity cards for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoActivityCardsSchema)
    .handler(async ({ context, input }) => getPrivateRepoActivityCards(input, context)),
  publicGetRepoBranchComparison: publicProcedure
    .route({
      description: "Get commit comparison between two branches for a public GitHub repository",
      method: "GET"
    })
    .input(RepoBranchComparisonInputSchema)
    .output(GitHubRepoBranchComparisonSchema.nullable())
    .handler(async ({ context, input }) => getRepoBranchComparison(input, context)),
  privateGetRepoBranchComparison: ownerProcedure
    .route({
      description: "Get commit comparison between two branches for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoBranchComparisonInputSchema)
    .output(GitHubRepoBranchComparisonSchema.nullable())
    .handler(async ({ context, input }) => getPrivateRepoBranchComparison(input, context)),
  publicGetRepoBranches: publicProcedure
    .route({
      description: "Get the public branches for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(z.array(GitHubRepoBranchSchema))
    .handler(async ({ context, input }) => getRepoBranches(input, context)),
  privateGetRepoBranches: ownerProcedure
    .route({
      description: "Get the branches for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(z.array(GitHubRepoBranchSchema))
    .handler(async ({ context, input }) => getPrivateRepoBranches(input, context)),
  publicGetRepoContributors: publicProcedure
    .route({
      description: "Get the public contributors for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(RepoContributorsResultSchema)
    .handler(async ({ context, input }) => getRepoContributors(input, context)),
  privateGetRepoContributors: ownerProcedure
    .route({
      description: "Get the contributors for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(RepoContributorsResultSchema)
    .handler(async ({ context, input }) => getPrivateRepoContributors(input, context)),
  publicGetRepoCommitSparkline: publicProcedure
    .route({
      description: "Get public commit sparkline data for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoCommitSparklineSchema)
    .handler(async ({ context, input }) => getRepoCommitSparkline(input, context)),
  privateGetRepoCommitSparkline: ownerProcedure
    .route({
      description: "Get commit sparkline data for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(GitHubRepoCommitSparklineSchema)
    .handler(async ({ context, input }) => getPrivateRepoCommitSparkline(input, context)),
  publicGetRepoFileContent: publicProcedure
    .route({
      description: "Get public file content for a GitHub repository path",
      method: "GET"
    })
    .input(RepoFileContentInputSchema)
    .output(z.string().nullable())
    .handler(async ({ context, input }) => getRepoFileContent(input, context)),
  privateGetRepoFileContent: ownerProcedure
    .route({
      description: "Get file content for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoFileContentInputSchema)
    .output(z.string().nullable())
    .handler(async ({ context, input }) => getPrivateRepoFileContent(input, context)),
  publicGetRefCommit: publicProcedure
    .route({
      description: "Get the latest commit for a specific ref in a public GitHub repository",
      method: "GET"
    })
    .input(RepoRefCommitInputSchema)
    .output(GitHubRepoLatestCommitSchema.nullable())
    .handler(async ({ context, input }) => getRepoRefCommit(input, context)),
  privateGetRefCommit: ownerProcedure
    .route({
      description: "Get the latest commit for a specific ref in any of the owner's repositories",
      method: "GET"
    })
    .input(RepoRefCommitInputSchema)
    .output(GitHubRepoLatestCommitSchema.nullable())
    .handler(async ({ context, input }) => getPrivateRepoRefCommit(input, context)),
  publicGetRepoOverview: publicProcedure
    .route({
      description: "Get the public overview for a GitHub repository",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(RepoOverviewSchema.nullable())
    .handler(async ({ input, context }) => getRepoOverview(input, context)),
  privateGetRepoOverview: ownerProcedure
    .route({
      description: "Get the overview for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoInputSchema)
    .output(RepoOverviewSchema.nullable())
    .handler(async ({ input, context }) => getPrivateRepoOverview(input, context)),
  publicGetRepoTree: publicProcedure
    .route({
      description: "Get public directory entries for a GitHub repository path",
      method: "GET"
    })
    .input(RepoTreeInputSchema)
    .output(z.array(GitHubRepoTreeEntrySchema))
    .handler(async ({ context, input }) => getRepoTree(input, context)),
  privateGetRepoTree: ownerProcedure
    .route({
      description: "Get directory entries for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoTreeInputSchema)
    .output(z.array(GitHubRepoTreeEntrySchema))
    .handler(async ({ context, input }) => getPrivateRepoTree(input, context)),
  publicGetTreeEntryCommits: publicProcedure
    .route({
      description: "Get latest commits for public repository tree entries",
      method: "GET"
    })
    .input(RepoTreeEntryCommitsInputSchema)
    .output(z.record(z.string(), GitHubTreeEntryCommitSchema.nullable()))
    .handler(async ({ context, input }) => getTreeEntryCommits(input, context)),
  privateGetTreeEntryCommits: ownerProcedure
    .route({
      description: "Get latest commits for tree entries in any of the owner's repositories",
      method: "GET"
    })
    .input(RepoTreeEntryCommitsInputSchema)
    .output(z.record(z.string(), GitHubTreeEntryCommitSchema.nullable()))
    .handler(async ({ context, input }) => getPrivateTreeEntryCommits(input, context)),
  publicGetUserActivity: publicProcedure
    .route({
      description: "Get public GitHub activity for a user",
      method: "GET"
    })
    .input(UserActivityInputSchema)
    .output(z.array(GitHubUserActivityEventSchema))
    .handler(async ({ context, input }) => getUserActivity(input, context)),
  privateGetUserActivity: ownerProcedure
    .route({
      description: "Get GitHub activity for the owner, including private-repo activity",
      method: "GET"
    })
    .input(UserActivityInputSchema)
    .output(z.array(GitHubUserActivityEventSchema))
    .handler(async ({ context, input }) => getPrivateUserActivity(input, context)),
  publicGetUserContributions: publicProcedure
    .route({
      description: "Get the public GitHub contribution calendar for a user",
      method: "GET"
    })
    .output(GitHubContributionCalendarSchema.nullable())
    .handler(async ({ context }) => getUserContributions(context)),
  privateGetUserContributions: ownerProcedure
    .route({
      description:
        "Get the GitHub contribution calendar for the owner, including private-repo contributions",
      method: "GET"
    })
    .output(GitHubContributionCalendarSchema.nullable())
    .handler(async ({ context }) => getPrivateUserContributions(context)),
  publicGetUserPinnedRepos: publicProcedure
    .route({
      description: "Get the pinned public GitHub repositories for a user",
      method: "GET"
    })
    .output(z.array(GitHubPinnedRepoSchema))
    .handler(async ({ context }) => getUserPinnedRepos(context)),
  privateGetUserPinnedRepos: ownerProcedure
    .route({
      description: "Get the pinned GitHub repositories for the owner, including private repos",
      method: "GET"
    })
    .output(z.array(GitHubPinnedRepoSchema))
    .handler(async ({ context }) => getPrivateUserPinnedRepos(context)),
  publicGetUserProfile: publicProcedure
    .route({
      description: "Get the public GitHub profile for a user",
      method: "GET"
    })
    .output(GitHubUserProfileSchema.nullable())
    .handler(async ({ context }) => getUserProfile(context)),
  privateGetUserProfile: ownerProcedure
    .route({
      description: "Get the full GitHub profile for the owner",
      method: "GET"
    })
    .output(GitHubUserProfileSchema.nullable())
    .handler(async ({ context }) => getPrivateUserProfile(context))
};
