import { type GitHubRepoCommitListItem } from "#@/repo/repo-commit-sparkline/repo-commit-sparkline.types";
import { type GitHubRepoCommitSparkline } from "#@/types";

const WEEK_COUNT = 16;
const WINDOW_DAYS = WEEK_COUNT * 7;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1_000;

export function getRepoCommitSparklineSince() {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1_000).toISOString();
}

export function emptyRepoCommitSparkline(): GitHubRepoCommitSparkline {
  return {
    weeklyCommits: Array.from({ length: WEEK_COUNT }, () => 0)
  };
}

export function mapRepoCommitSparkline(
  commits: GitHubRepoCommitListItem[]
): GitHubRepoCommitSparkline {
  return {
    weeklyCommits: bucketCommitsByWeek(
      commits.flatMap((commit) => {
        const date = commit.commit.author?.date ?? commit.commit.committer?.date;

        return date ? [date] : [];
      })
    )
  };
}

function bucketCommitsByWeek(commitDates: string[]) {
  const counts = Array.from({ length: WEEK_COUNT }, () => 0);
  const now = Date.now();

  for (const commitDate of commitDates) {
    const timestamp = new Date(commitDate).getTime();
    if (!Number.isFinite(timestamp) || timestamp > now) {
      continue;
    }

    const ageInWeeks = Math.floor((now - timestamp) / WEEK_IN_MS);
    if (ageInWeeks >= WEEK_COUNT) {
      continue;
    }

    counts[WEEK_COUNT - ageInWeeks - 1] += 1;
  }

  return counts;
}
