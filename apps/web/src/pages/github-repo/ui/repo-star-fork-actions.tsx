import { GitFork, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa6";

import { Button } from "@tsu-stack/ui/components/button.js";
import { IconSlideSwap } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

type RepoStarForkActionsProps = {
  forkCount: number;
  repoUrl: string;
  stars: number;
};

/**
 * Star opens the GitHub repo so visitors can star there.
 * Hover on the whole control (data-hovered): GitHub → star + sparkle.
 */
export function RepoStarForkActions({ forkCount, repoUrl, stars }: RepoStarForkActionsProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <motion.a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Star this repository on GitHub (${stars.toLocaleString()} stars)`}
        title="Open on GitHub to star"
        data-hovered={hovered ? "" : undefined}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className={cn(
          "relative inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-popover px-4 text-foreground shadow-xs/5 transition-colors",
          "hover:bg-accent/50 sm:h-8 dark:border-white/10 dark:bg-white/4 hover:dark:bg-white/6"
        )}
      >
        <IconSlideSwap
          mode="hover"
          sparkle
          iconA={<FaGithub className="size-4" aria-hidden />}
          iconB={<Star className="size-4 fill-current text-yellow-400" aria-hidden />}
        />
        <span className="ms-2.5 text-[13px] font-medium tracking-tight">
          Star on GitHub
          <span className="ms-1.5 text-muted-foreground tabular-nums">
            · {stars.toLocaleString()}
          </span>
        </span>
      </motion.a>

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
      >
        <GitFork className="size-4" />
        {forkCount.toLocaleString()}
      </Button>
    </div>
  );
}
