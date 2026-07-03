import { GitFork, Star } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";

type RepoStarForkActionsProps = {
  forkCount: number;
  repoUrl: string;
  stars: number;
};

export function RepoStarForkActions({ forkCount, repoUrl, stars }: RepoStarForkActionsProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Button
        render={
          <a
            href={`${repoUrl}/stargazers`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${stars.toLocaleString()} stargazers`}
          />
        }
        variant="outline"
      >
        <Star className="size-4" />
        {stars.toLocaleString()}
      </Button>
      <Button
        render={
          <a
            href={`${repoUrl}/forks`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${forkCount.toLocaleString()} forks`}
          />
        }
        variant="outline"
      >
        <GitFork className="size-4" />
        {forkCount.toLocaleString()}
      </Button>
    </div>
  );
}
