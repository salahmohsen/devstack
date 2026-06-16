import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { GitForkIcon, StarIcon } from "@tsu-stack/icons";
import { Badge } from "@tsu-stack/ui/components/badge";

import { formatGithubCount } from "@/shared/lib/format-github-count";

type PinnedRepoCardProps = {
  repo: {
    description: string | null;
    forks: number;
    isPrivate: boolean;
    language: string | null;
    languageColor: string | null;
    name: string;
    owner: string;
    stars: number;
  };
};

export function PinnedRepoCard({ repo }: PinnedRepoCardProps) {
  return (
    <Link
      to={`/$repo`}
      params={{ repo: repo.name }}
      className="flex min-h-36 flex-col gap-3 rounded-md border bg-surface-1 p-4 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold">{repo.name}</span>
        {repo.isPrivate ? (
          <Badge variant="outline" className="text-[10px]">
            Private
          </Badge>
        ) : null}
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
        {repo.description ?? "No repository description."}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs">
        {repo.language ? (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: repo.languageColor ?? "#6e7681" }}
            />
            {repo.language}
          </span>
        ) : null}
        {repo.stars > 0 ? (
          <span className="flex items-center gap-1">
            <StarIcon className="size-3.5" />
            {formatGithubCount(repo.stars)}
          </span>
        ) : null}
        {repo.forks > 0 ? (
          <span className="flex items-center gap-1">
            <GitForkIcon className="size-3.5" />
            {formatGithubCount(repo.forks)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
