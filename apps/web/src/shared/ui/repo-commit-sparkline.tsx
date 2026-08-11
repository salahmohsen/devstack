import { useId } from "react";
import { Area, AreaChart } from "recharts";

import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { useGetGithubRepoCommitSparklineQuery } from "@/shared/lib/github-repo-commit-sparkline.query";

const CHART_W = 168;
const CHART_H = 52;
const ACTIVE_LINE = "#60C679";

const INACTIVE_STROKE = "var(--foreground)";

const ACTIVE_GRADIENT_STOPS = [
  { offset: "0%", opacity: 0.52 },
  { offset: "50%", opacity: 0.2 },
  { offset: "100%", opacity: 0 }
] as const;

const INACTIVE_GRADIENT_STOPS = [
  { offset: "0%", opacity: 0.44 },
  { offset: "50%", opacity: 0.14 },
  { offset: "100%", opacity: 0 }
] as const;

export function RepoCommitSparkline({ username, repo }: { username: string; repo: string }) {
  const fillGradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hasMounted = useIsClient();
  const query = useGetGithubRepoCommitSparklineQuery(repo, username);

  if (!hasMounted || query.isLoading) {
    return <div className="h-13 w-42 shrink-0 rounded-sm bg-muted/15" aria-hidden />;
  }

  const weekly = query.data?.weeklyCommits ?? [];
  const hasActivity = weekly.some((n) => typeof n === "number" && n > 0);
  const strokeColor = hasActivity ? ACTIVE_LINE : INACTIVE_STROKE;
  const strokeOpacity = hasActivity ? 1 : 0.5;
  const gradientStops = hasActivity ? ACTIVE_GRADIENT_STOPS : INACTIVE_GRADIENT_STOPS;

  // Server buckets ~16 weeks (see mapRepoCommitSparkline WEEK_COUNT).
  const weekCount = weekly.length > 0 ? weekly.length : 16;
  const chartData =
    weekly.length > 0
      ? weekly.map((commits, i) => {
          return { i, commits };
        })
      : Array.from({ length: weekCount }, (_, i) => {
          return { i, commits: 0 };
        });

  const chartLabel = hasActivity
    ? `Weekly commit activity for ${repo}, last ${weekCount} weeks`
    : `No commits in the last ${weekCount} weeks for ${repo}`;

  return (
    <figure className="pointer-events-none shrink-0 select-none" aria-label={chartLabel}>
      <AreaChart
        width={CHART_W}
        height={CHART_H}
        data={chartData}
        margin={{ top: 6, right: 2, bottom: 4, left: 2 }}
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            {gradientStops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={strokeColor}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="commits"
          stroke={strokeColor}
          strokeWidth={2}
          strokeOpacity={strokeOpacity}
          fill={`url(#${fillGradientId})`}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </figure>
  );
}
