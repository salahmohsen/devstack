import { Archive, ArrowRight } from "lucide-react";

import { Badge } from "@tsu-stack/ui/components/badge";

import { RepoStarForkActions } from "@/pages/github-repo/ui/repo-star-fork-actions";

type RepoHeaderProps = {
  repo: {
    description: string | null;
    forkParentFullName: string | null;
    forks: number;
    isFork: boolean;
    isPrivate: boolean;
    name: string;
    owner: string;
    ownerAvatarUrl: string;
    stars: number;
    url: string;
  };
};

/**
 * Mobile: identity block, then star/fork on their own row.
 * md+: original single row — title left, actions right (justify-between).
 */
export function RepoHeader({ repo }: RepoHeaderProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {repo.ownerAvatarUrl ? (
          <img
            alt={repo.owner}
            className="size-9 shrink-0 rounded-lg sm:size-8"
            src={repo.ownerAvatarUrl}
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white-4 sm:size-8">
            <Archive className="size-4 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-base sm:text-lg">
            <a
              className="max-w-full min-w-0 truncate font-medium text-accent-foreground hover:underline"
              href={`/${repo.owner}`}
              title={repo.owner}
            >
              {repo.owner}
            </a>
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              /
            </span>
            <span className="max-w-full min-w-0 truncate font-semibold" title={repo.name}>
              {repo.name}
            </span>
            <Badge variant="outline" className="w-fit shrink-0 text-[10px] text-accent-foreground">
              {repo.isPrivate ? "Private" : "Public"}
            </Badge>
          </div>

          {repo.description ? (
            <p className="text-sm text-pretty text-muted-foreground">{repo.description}</p>
          ) : null}

          {repo.isFork && repo.forkParentFullName ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowRight className="size-3.5 shrink-0" />
              <span className="shrink-0">forked from</span>
              <a
                className="min-w-0 truncate font-medium text-accent-foreground hover:underline"
                href={`/${repo.forkParentFullName}`}
                title={repo.forkParentFullName}
              >
                {repo.forkParentFullName}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {/* Full-width row under title on mobile; shrink-to-content on the right from md. */}
      <div className="w-full min-w-0 shrink-0 md:w-auto md:justify-end">
        <RepoStarForkActions forkCount={repo.forks} repoUrl={repo.url} stars={repo.stars} />
      </div>
    </div>
  );
}
