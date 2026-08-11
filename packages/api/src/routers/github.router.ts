import { z } from "zod";

import { GitHubUsernameSchema, PublicUsernameInputSchema } from "@tsu-stack/core";
import { getDb } from "@tsu-stack/db";
import {
  bumpGitHubCacheNamespaces,
  getGitHubRevalidationSignals,
  getPrivateProfileRepos,
  getPrivateRepoBranchComparison,
  getPrivateRepoBranches,
  getPrivateRepoCommitSparkline,
  getPrivateRepoContributors,
  getPrivateRepoDiscussions,
  getPrivateRepoFileContent,
  getPrivateRepoIssues,
  getPrivateRepoOverview,
  getPrivateRepoPulls,
  getPrivateRepoRefCommit,
  getPrivateRepoTree,
  getPrivateRepoWorkflowRuns,
  getPrivateTreeEntryCommits,
  getPrivateUserActivity,
  getPrivateUserContributions,
  getPrivateUserPinnedRepos,
  getPrivateUserProfile,
  getProfileRepos,
  getRepoBranchComparison,
  getRepoBranches,
  getRepoCommitSparkline,
  getRepoContributors,
  getRepoDiscussions,
  getRepoFileContent,
  getRepoIssues,
  getRepoOverview,
  getRepoPulls,
  getRepoRefCommit,
  getRepoTree,
  getRepoWorkflowRuns,
  getTreeEntryCommits,
  getUserActivity,
  getUserContributions,
  getUserPinnedRepos,
  getUserProfile,
  markGitHubRevalidationSignals
} from "@tsu-stack/github";
import {
  GitHubContributionCalendarSchema,
  GitHubDiscussionsResultSchema,
  GitHubIssueSummarySchema,
  GitHubPinnedRepoSchema,
  GitHubPullSummarySchema,
  GitHubRepoBranchComparisonSchema,
  GitHubRepoBranchSchema,
  GitHubRepoCommitSparklineSchema,
  GitHubRepoLatestCommitSchema,
  GitHubRepoTreeEntrySchema,
  GitHubTreeEntryCommitSchema,
  GitHubUserActivityEventSchema,
  GitHubUserProfileSchema,
  GitHubUserRepoSummarySchema,
  GitHubWorkflowRunSchema,
  RepoContributorsResultSchema,
  RepoOverviewSchema
} from "@tsu-stack/github/schemas";

import {
  getPublicGitHubSetupStatus,
  withPublicGitHubContext
} from "#@/lib/github/with-public-github-context";
import { ownerProcedure, protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

const PublicGitHubStatusOutputSchema = z.object({
  isConfigured: z.boolean(),
  owner: GitHubUsernameSchema.nullable()
});

const UserActivityInputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

/** GitHub repo name segment (not owner/repo). Rejects JS stringifications of missing values. */
const GitHubRepoNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, "Invalid repository name")
  .refine((name) => !["undefined", "null", "NaN"].includes(name), {
    message: "Invalid repository name"
  });

const RepoInputSchema = z.object({
  repo: GitHubRepoNameSchema
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

const RepoListStateSchema = z.enum(["open", "closed", "all"]).default("open");
const RepoPullsSortSchema = z
  .enum(["created", "long-running", "popularity", "updated"])
  .default("updated");
const RepoListDirectionSchema = z.enum(["asc", "desc"]).default("desc");
const RepoIssuesSortSchema = z.enum(["comments", "created", "updated"]).default("updated");

const RepoPullsInputSchema = RepoInputSchema.extend({
  state: RepoListStateSchema,
  sort: RepoPullsSortSchema,
  direction: RepoListDirectionSchema,
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(5)
});

const RepoIssuesInputSchema = RepoInputSchema.extend({
  state: RepoListStateSchema,
  sort: RepoIssuesSortSchema,
  direction: RepoListDirectionSchema,
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(5)
});

const RepoWorkflowRunsInputSchema = RepoInputSchema.extend({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(5)
});

const RepoDiscussionsInputSchema = RepoInputSchema.extend({
  first: z.number().int().min(1).max(50).default(5)
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

/** Merge optional username (tenant path handle) onto public GitHub inputs. */
const withUsername = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    username: PublicUsernameInputSchema.shape.username
  });

export const githubRouter = {
  getRevalidationSignals: publicProcedure
    .route({ description: "Get revalidation signal timestamps", method: "GET" })
    .input(z.object({ signalKeys: z.array(z.string()) }))
    .output(RevalidationSignalsOutputSchema)
    .handler(async ({ input }) => getGitHubRevalidationSignals(input.signalKeys)),
  getSetupStatus: publicProcedure
    .route({
      description: "Get GitHub setup status for a public profile (path or custom domain Host)",
      method: "GET"
    })
    .input(PublicUsernameInputSchema.optional())
    .output(PublicGitHubStatusOutputSchema)
    .handler(async ({ context, input }) =>
      getPublicGitHubSetupStatus(context, { username: input?.username })
    ),
  refreshInstallationAccess: protectedProcedure
    .route({ description: "Refresh installation access cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await getDb().transaction(async (tx) => {
        await markGitHubRevalidationSignals(["installationAccess"], tx);
      });
      return { ok: true };
    }),
  clearViewerCache: protectedProcedure
    .route({ description: "Clear viewer's GitHub cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await getDb().transaction(async (tx) => {
        await markGitHubRevalidationSignals(
          ["installationAccess", "pulls.mine", "issues.mine", "notifications"],
          tx
        );
        await bumpGitHubCacheNamespaces(
          [
            "repos.list",
            "pulls.authored",
            "pulls.assigned",
            "pulls.reviewRequested",
            "pulls.mentioned",
            "pulls.involved",
            "issues.authored",
            "issues.assigned",
            "issues.mentioned"
          ],
          tx
        );
      });
      return { ok: true };
    }),
  publicGetProfileRepos: publicProcedure
    .route({
      description: "Get the public repository list for a portfolio profile's linked GitHub",
      method: "GET"
    })
    .input(PublicUsernameInputSchema)
    .output(z.array(GitHubUserRepoSummarySchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getProfileRepos(scoped))
    ),
  privateGetProfileRepos: ownerProcedure
    .route({
      description: "Get the owner's full repository list, including private repos",
      method: "GET"
    })
    .output(z.array(GitHubUserRepoSummarySchema))
    .handler(async ({ context }) => getPrivateProfileRepos(context)),
  publicGetRepoBranchComparison: publicProcedure
    .route({
      description: "Get commit comparison between two branches for a public GitHub repository",
      method: "GET"
    })
    .input(withUsername(RepoBranchComparisonInputSchema))
    .output(GitHubRepoBranchComparisonSchema.nullable())
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoBranchComparison(input, scoped))
    ),
  privateGetRepoBranchComparison: ownerProcedure
    .route({
      description: "Get commit comparison between two branches for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoBranchComparisonInputSchema)
    .output(GitHubRepoBranchComparisonSchema.nullable())
    .handler(async ({ context, input }) => getPrivateRepoBranchComparison(input, context)),
  publicGetRepoPulls: publicProcedure
    .route({
      description: "Get the public pull requests for a GitHub repository",
      method: "GET"
    })
    .input(withUsername(RepoPullsInputSchema))
    .output(z.array(GitHubPullSummarySchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoPulls(input, scoped))
    ),
  privateGetRepoPulls: ownerProcedure
    .route({
      description: "Get the pull requests for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoPullsInputSchema)
    .output(z.array(GitHubPullSummarySchema))
    .handler(async ({ context, input }) => getPrivateRepoPulls(input, context)),
  publicGetRepoIssues: publicProcedure
    .route({
      description: "Get the public issues for a GitHub repository",
      method: "GET"
    })
    .input(withUsername(RepoIssuesInputSchema))
    .output(z.array(GitHubIssueSummarySchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoIssues(input, scoped))
    ),
  privateGetRepoIssues: ownerProcedure
    .route({
      description: "Get the issues for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoIssuesInputSchema)
    .output(z.array(GitHubIssueSummarySchema))
    .handler(async ({ context, input }) => getPrivateRepoIssues(input, context)),
  publicGetRepoWorkflowRuns: publicProcedure
    .route({
      description: "Get the public GitHub Actions workflow runs for a repository",
      method: "GET"
    })
    .input(withUsername(RepoWorkflowRunsInputSchema))
    .output(z.array(GitHubWorkflowRunSchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoWorkflowRuns(input, scoped))
    ),
  privateGetRepoWorkflowRuns: ownerProcedure
    .route({
      description: "Get the GitHub Actions workflow runs for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoWorkflowRunsInputSchema)
    .output(z.array(GitHubWorkflowRunSchema))
    .handler(async ({ context, input }) => getPrivateRepoWorkflowRuns(input, context)),
  publicGetRepoDiscussions: publicProcedure
    .route({
      description: "Get the public discussions for a GitHub repository",
      method: "GET"
    })
    .input(withUsername(RepoDiscussionsInputSchema))
    .output(GitHubDiscussionsResultSchema)
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoDiscussions(input, scoped))
    ),
  privateGetRepoDiscussions: ownerProcedure
    .route({
      description: "Get the discussions for any of the owner's repositories",
      method: "GET"
    })
    .input(RepoDiscussionsInputSchema)
    .output(GitHubDiscussionsResultSchema)
    .handler(async ({ context, input }) => getPrivateRepoDiscussions(input, context)),
  publicGetRepoBranches: publicProcedure
    .route({
      description: "Get the public branches for a GitHub repository",
      method: "GET"
    })
    .input(withUsername(RepoInputSchema))
    .output(z.array(GitHubRepoBranchSchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoBranches(input, scoped))
    ),
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
    .input(withUsername(RepoInputSchema))
    .output(RepoContributorsResultSchema)
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoContributors(input, scoped))
    ),
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
    .input(withUsername(RepoInputSchema))
    .output(GitHubRepoCommitSparklineSchema)
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoCommitSparkline(input, scoped))
    ),
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
    .input(withUsername(RepoFileContentInputSchema))
    .output(z.string().nullable())
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoFileContent(input, scoped))
    ),
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
    .input(withUsername(RepoRefCommitInputSchema))
    .output(GitHubRepoLatestCommitSchema.nullable())
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoRefCommit(input, scoped))
    ),
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
    .input(withUsername(RepoInputSchema))
    .output(RepoOverviewSchema.nullable())
    .handler(async ({ input, context }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoOverview(input, scoped))
    ),
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
    .input(withUsername(RepoTreeInputSchema))
    .output(z.array(GitHubRepoTreeEntrySchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getRepoTree(input, scoped))
    ),
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
    .input(withUsername(RepoTreeEntryCommitsInputSchema))
    .output(z.record(z.string(), GitHubTreeEntryCommitSchema.nullable()))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getTreeEntryCommits(input, scoped))
    ),
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
    .input(withUsername(UserActivityInputSchema))
    .output(z.array(GitHubUserActivityEventSchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getUserActivity(input, scoped))
    ),
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
    .input(PublicUsernameInputSchema)
    .output(GitHubContributionCalendarSchema.nullable())
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getUserContributions(scoped))
    ),
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
    .input(PublicUsernameInputSchema)
    .output(z.array(GitHubPinnedRepoSchema))
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getUserPinnedRepos(scoped))
    ),
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
    .input(PublicUsernameInputSchema)
    .output(GitHubUserProfileSchema.nullable())
    .handler(async ({ context, input }) =>
      withPublicGitHubContext(context, input, (scoped) => getUserProfile(scoped))
    ),
  privateGetUserProfile: ownerProcedure
    .route({
      description: "Get the full GitHub profile for the owner",
      method: "GET"
    })
    .output(GitHubUserProfileSchema.nullable())
    .handler(async ({ context }) => getPrivateUserProfile(context))
};
