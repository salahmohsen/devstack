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
  GitHubLocalFirstMeta
} from "#@/schemas";

export type GitHubLocalFirstResult<TData> = {
  data: TData;
  meta: {
    cacheStatus: "fresh" | "stale" | "miss";
    fetchedAt: string | null;
    isRevalidating: boolean;
  };
};
