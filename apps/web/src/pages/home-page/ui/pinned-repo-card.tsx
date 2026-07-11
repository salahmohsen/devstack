import { Link } from "@tanstack/react-router";
import { GitFork, Star } from "lucide-react";

import { formatCompactCount } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";

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
      to="/repos/$repo"
      params={{ repo: repo.name }}
      className="flex min-h-36 flex-col gap-3 rounded-md border bg-background p-4 transition-colors"
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
            <Star className="size-3.5" />
            {formatCompactCount(repo.stars)}
          </span>
        ) : null}
        {repo.forks > 0 ? (
          <span className="flex items-center gap-1">
            <GitFork className="size-3.5" />
            {formatCompactCount(repo.forks)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
