import { GitFork, Star } from "lucide-react";
import { FaGithub } from "react-icons/fa6";

import { Button } from "@tsu-stack/ui/components/button.js";
import { IconSlideSwap } from "@tsu-stack/ui/components/icon-motion";

type RepoStarForkActionsProps = {
  forkCount: number;
  repoUrl: string;
  stars: number;
};

/**
 * Star opens the GitHub repo so visitors can star there.
 * Hover on the whole control (Button `data-hovered`): GitHub → star + sparkle.
 */
export function RepoStarForkActions({ forkCount, repoUrl, stars }: RepoStarForkActionsProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground md:w-auto">
      <Button
        variant="outline"
        render={
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Star this repository on GitHub (${stars.toLocaleString()} stars)`}
            title="Open on GitHub to star"
          />
        }
        className="min-w-0 flex-1 md:flex-initial"
      >
        <IconSlideSwap
          mode="hover"
          sparkle
          iconA={<FaGithub className="size-4" aria-hidden />}
          iconB={<Star className="size-4 fill-current text-yellow-400" aria-hidden />}
        />
        <span className="md:hidden">Star</span>
        <span className="hidden md:inline">Star on GitHub</span>
        <span className="text-muted-foreground tabular-nums">· {stars.toLocaleString()}</span>
      </Button>

      <Button
        render={
          <a
            href={`${repoUrl}/forks`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${forkCount.toLocaleString()} forks`}
          />
        }
        variant="outline"
        className="shrink-0"
      >
        <GitFork className="size-4" />
        {forkCount.toLocaleString()}
      </Button>
    </div>
  );
}
