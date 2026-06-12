import { ArchiveIcon, ArrowRightIcon } from "@tsu-stack/icons";
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
              <ArchiveIcon className="size-4 text-base-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-lg">
              <a
                className="truncate font-medium text-base-300 hover:underline"
                href={`/${repo.owner}`}
              >
                {repo.owner}
              </a>
              <span className="text-base-600">/</span>
              <span className="truncate font-semibold text-white">{repo.name}</span>
              <Badge variant="outline" className="border-white/10 text-[10px] text-base-300">
                {repo.isPrivate ? "Private" : "Public"}
              </Badge>
            </div>
            {repo.description ? (
              <p className="mt-1 text-sm text-base-400">{repo.description}</p>
            ) : null}
          </div>
        </div>

        {repo.isFork && repo.forkParentFullName ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-base-400">
            <ArrowRightIcon className="size-3.5" />
            forked from
            <a
              className="font-medium text-base-200 hover:underline"
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
