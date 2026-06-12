import { useGetGithubRepoCommitSparklineQuery } from "@/pages/github-repo/api/get-github-repo-commit-sparkline.query";

const CHART_HEIGHT = 52;
const CHART_WIDTH = 168;

export function RepoCommitSparkline({ owner, repo }: { owner: string; repo: string }) {
  const query = useGetGithubRepoCommitSparklineQuery(owner, repo);
  const values = query.data?.weeklyCommits ?? [];
  const points = values.length > 0 ? values : Array.from({ length: 16 }, () => 0);
  const maxValue = Math.max(1, ...points);
  const stepX = CHART_WIDTH / Math.max(points.length - 1, 1);

  const polylinePoints = points
    .map((value, index) => {
      const x = index * stepX;
      const y = CHART_HEIGHT - (value / maxValue) * (CHART_HEIGHT - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-label={`Commit activity for ${owner}/${repo}`}
      className="h-13 w-42 shrink-0"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      <polyline
        fill="none"
        points={polylinePoints}
        stroke="#39d353"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
