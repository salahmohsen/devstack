import { Suspense, useEffect, useRef, useState } from "react";

import { GitForkIcon, LockIcon, StarIcon } from "@tsu-stack/icons";
import { Badge } from "@tsu-stack/ui/components/badge";

import { formatGithubCount } from "@/pages/github-profile/lib/format-github-count";
import { RepoCommitSparkline } from "@/pages/github-repo/ui/repo-commit-sparkline";

const sparklineFallback = <div className="h-13 w-42 shrink-0 rounded-sm bg-white/4" aria-hidden />;

type RepositoryRowProps = {
  repo: {
    description: string | null;
    forkCount: number;
    fullName: string;
    language: string | null;
    languageColor: string | null;
    name: string;
    owner: string;
    stars: number;
    updatedAt: string;
    visibility: "internal" | "private" | "public";
  };
};

export function RepositoryRow({ repo }: RepositoryRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowChart(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={`/${repo.owner}/${repo.name}`}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 transition-colors hover:bg-white/5 md:grid-cols-[minmax(10rem,22%)_minmax(0,1fr)_minmax(10rem,auto)_11rem] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-white" title={repo.fullName}>
            <span className="text-base-400">{repo.owner}</span>/{repo.name}
          </p>
          {repo.visibility !== "public" ? (
            <Badge variant="outline" className="border-white/10 text-[10px] text-base-300">
              <LockIcon className="size-3" />
              {repo.visibility}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-xs leading-snug text-base-400">
          {repo.description ?? "No repository description."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-400 md:justify-end">
        {repo.language ? (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: repo.languageColor ?? "#6e7681" }}
            />
            {repo.language}
          </span>
        ) : null}
        <span>{formatCompactRelativeTime(repo.updatedAt)}</span>
        {repo.stars > 0 ? (
          <span className="flex items-center gap-1">
            <StarIcon className="size-3.5" />
            {formatGithubCount(repo.stars)}
          </span>
        ) : null}
        {repo.forkCount > 0 ? (
          <span className="flex items-center gap-1">
            <GitForkIcon className="size-3.5" />
            {formatGithubCount(repo.forkCount)}
          </span>
        ) : null}
      </div>

      <div ref={containerRef} className="flex items-start justify-end">
        {showChart ? (
          <Suspense fallback={sparklineFallback}>
            <RepoCommitSparkline owner={repo.owner} repo={repo.name} />
          </Suspense>
        ) : (
          sparklineFallback
        )}
      </div>
    </a>
  );
}

function formatCompactRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  if (diffDays >= 365) {
    return `${Math.round(diffDays / 365)}y`;
  }
  if (diffDays >= 30) {
    return `${Math.round(diffDays / 30)}mo`;
  }
  if (diffDays >= 7) {
    return `${Math.round(diffDays / 7)}w`;
  }

  return `${diffDays}d`;
}
