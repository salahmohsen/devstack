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

export function RepoHeader({ repo }: RepoHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 items-center gap-3">
          {repo.ownerAvatarUrl ? (
            <img alt={repo.owner} className="size-8 rounded-lg" src={repo.ownerAvatarUrl} />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/4">
              <Archive className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-lg">
              <a
                className="truncate font-medium text-accent-foreground hover:underline"
                href={`/${repo.owner}`}
              >
                {repo.owner}
              </a>
              <span className="text-base-600">/</span>
              <span className="truncate font-semibold">{repo.name}</span>
              <Badge variant="outline" className="text-[10px] text-accent-foreground">
                {repo.isPrivate ? "Private" : "Public"}
              </Badge>
            </div>
            {repo.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{repo.description}</p>
            ) : null}
          </div>
        </div>

        {repo.isFork && repo.forkParentFullName ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="size-3.5" />
            forked from
            <a
              className="font-medium text-accent-foreground hover:underline"
              href={`/${repo.forkParentFullName}`}
            >
              {repo.forkParentFullName}
            </a>
          </div>
        ) : null}
      </div>

      <RepoStarForkActions forkCount={repo.forks} repoUrl={repo.url} stars={repo.stars} />
    </div>
  );
}
