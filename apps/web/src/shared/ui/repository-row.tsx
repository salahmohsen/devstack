import { Link } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, GitFork, Star } from "lucide-react";
import { Fragment, memo, type ReactNode } from "react";

import { formatCompactCount } from "@tsu-stack/core";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";
import { Card } from "@tsu-stack/ui/components/card.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";
import { publicRepoOverviewLocation, type PublicSurface } from "@/shared/lib/public-surface";
import { LazyRepoCommitSparkline } from "@/shared/ui/repo-commit-sparkline-lazy";

const languageColors: Record<string, string> = {
  Astro: "#ff5a03",
  CSS: "#563d7c",
  Go: "#00add8",
  HTML: "#e34c26",
  JavaScript: "#f1e05a",
  MDX: "#fcb32c",
  Python: "#3572a5",
  Rust: "#dea584",
  Shell: "#89e051",
  Swift: "#f05138",
  TypeScript: "#3178c6"
};

const visibilityAria: Record<GitHubUserRepoSummary["visibility"], string> = {
  public: "Public repository",
  private: "Private repository",
  internal: "Internal repository"
};

function VisibilityBadge({ visibility }: { visibility: GitHubUserRepoSummary["visibility"] }) {
  const label = visibilityAria[visibility];
  const Icon = visibility === "public" ? EyeIcon : EyeOffIcon;

  return (
    <span
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
      aria-label={label}
      title={label}
    >
      <Icon size={14} strokeWidth={2} aria-hidden />
    </span>
  );
}

export const RepositoryRow = memo(function RepositoryRow({
  repo,
  isAdmin,
  username,
  surface,
  nameEnd,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  repo: GitHubUserRepoSummary;
  isAdmin: boolean;
  /** Tenant slug (data loaders / sparkline). */
  username: string;
  /** Path vs custom-domain — controls whether links omit the profile segment. */
  surface: PublicSurface;
  /** Sibling of the stretched repo link (e.g. view-project). Not nested in the <a>. */
  nameEnd?: ReactNode;
}) {
  const overview = publicRepoOverviewLocation(surface, repo.name);
  const metaEntries: { key: string; node: ReactNode }[] = [];
  if (repo.language) {
    metaEntries.push({
      key: "lang",
      node: (
        <span className="flex shrink-0 items-center gap-1">
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{
              backgroundColor: repo.languageColor ?? languageColors[repo.language] ?? "var(--muted)"
            }}
          />
          {repo.language}
        </span>
      )
    });
  }
  if (repo.updatedAt) {
    metaEntries.push({
      key: "time",
      node: <span className="shrink-0">{formatRelativeTime(repo.updatedAt)}</span>
    });
  }
  if (repo.stars > 0) {
    metaEntries.push({
      key: "stars",
      node: (
        <span className="flex shrink-0 items-center gap-1 tabular-nums">
          <Star size={13} strokeWidth={2} />
          {formatCompactCount(repo.stars)}
        </span>
      )
    });
  }
  if (repo.forks > 0) {
    metaEntries.push({
      key: "forks",
      node: (
        <span className="flex shrink-0 items-center gap-1 tabular-nums">
          <GitFork size={13} strokeWidth={2} />
          {formatCompactCount(repo.forks)}
        </span>
      )
    });
  }

  return (
    <Card
      className={cn(
        "transition-[transform,box-shadow] duration-200 hover:scale-99 hover:shadow-none",
        className
      )}
      {...props}
    >
      <div className="relative grid w-full grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(10rem,22%)_minmax(0,1fr)_minmax(10rem,auto)_11rem] md:gap-y-1">
        <Link
          to={overview.to}
          params={overview.params as never}
          className="absolute inset-0 z-0 rounded-[inherit]"
          aria-label={`Open repository ${repo.name}`}
        />
        <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-0.5">
          <div className="flex max-w-full min-w-0 items-center gap-x-2">
            {isAdmin && <VisibilityBadge visibility={repo.visibility} />}
            <p className="flex min-w-0 items-baseline text-sm font-medium" title={repo.fullName}>
              <span className="truncate">{repo.name}</span>
            </p>
            {nameEnd ? <div className="pointer-events-auto shrink-0">{nameEnd}</div> : null}
          </div>
        </div>
        <div className="pointer-events-none relative z-10 min-w-0">
          {repo.description ? (
            <p className="line-clamp-2 text-xs leading-snug wrap-break-word text-muted-foreground md:max-w-none">
              {repo.description}
            </p>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          )}
        </div>

        {metaEntries.length > 0 ? (
          <div className="pointer-events-none relative z-10 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground md:justify-end">
            {metaEntries.map((entry, index) => (
              <Fragment key={entry.key}>
                {index > 0 ? <span className="shrink-0 text-muted-foreground/60">·</span> : null}
                {entry.node}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="pointer-events-none relative z-10 md:text-right">
            <span className="text-xs text-muted-foreground/40">-</span>
          </div>
        )}
        <div className="pointer-events-none relative z-10">
          <LazyRepoCommitSparkline username={username} repo={repo.name} />
        </div>
      </div>
    </Card>
  );
});
