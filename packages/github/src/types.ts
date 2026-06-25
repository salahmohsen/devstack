import { type GitHubDataSource, type GitHubLocalFirstMeta } from "#@/schemas";

export type {
  GitHubContributionDay,
  GitHubContributionWeek,
  GitHubContributionCalendar,
  GitHubPinnedRepo,
  GitHubUserActivityEvent,
  GitHubUserProfile,
  GitHubUserRepoSummary,
  GitHubRepoLatestCommit,
  GitHubRepoBranch,
  GitHubRepoTreeEntry,
  GitHubActor,
  GitHubTreeEntryCommit,
  GitHubRepoBranchComparison,
  GitHubRepoCommitSparkline,
  GitHubRepoActivityCardPullRequest,
  GitHubRepoActivityCardIssue,
  GitHubRepoActivityCardAction,
  GitHubRepoActivityCards,
  RepoContributor,
  RepoContributorsResult
} from "#@/schemas";

export type { GitHubDataSource, GitHubLocalFirstMeta };

export type GitHubLocalFirstResult<TData> = {
  data: TData;
  meta: {
    cacheStatus: "fresh" | "stale" | "miss";
    fetchedAt: string | null;
    isRevalidating: boolean;
    source: GitHubDataSource;
  };
};
