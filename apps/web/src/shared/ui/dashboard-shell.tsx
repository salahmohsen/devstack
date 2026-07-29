import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode } from "react";

import { Card } from "@tsu-stack/ui/components/card.js";
import { cn } from "@tsu-stack/ui/lib/utils";

const FADE = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
};

/**
 * Main elevated surface for a dashboard section (settings, mail hub, review).
 * Nest {@link IslandCard} inside for the darker floating nav/list.
 */
export function SurfaceShell({
  className,
  children,
  fadeIn = true,
  ...props
}: ComponentProps<"div"> & { fadeIn?: boolean }) {
  const reduceMotion = useReducedMotion();
  const content = (
    <Card
      data-slot="dashboard-surface"
      className={cn(
        "relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-card p-3 sm:p-4",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );

  if (!fadeIn || reduceMotion) {
    return content;
  }

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      initial={FADE.initial}
      animate={FADE.animate}
      transition={{ ...FADE.transition, delay: 0.04 }}
    >
      {content}
    </motion.div>
  );
}

/**
 * Darker nested card — floating island for section nav or mail categories.
 * Sits on top of {@link SurfaceShell}; uses a muted step of the surface.
 */
export function IslandCard({
  className,
  children,
  fadeIn = true,
  ...props
}: ComponentProps<"div"> & { fadeIn?: boolean }) {
  const reduceMotion = useReducedMotion();
  const content = (
    <div
      data-slot="dashboard-island"
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/80 text-card-foreground shadow-xs/5",
        "not-dark:bg-clip-padding dark:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (!fadeIn || reduceMotion) {
    return content;
  }

  return (
    <motion.div
      className="flex min-h-0 shrink-0 flex-col"
      initial={FADE.initial}
      animate={FADE.animate}
      transition={FADE.transition}
    >
      {content}
    </motion.div>
  );
}

type SurfaceIslandLayoutProps = {
  island: ReactNode;
  children: ReactNode;
  className?: string;
  /** Island width on md+; full width stacked on small screens */
  islandClassName?: string;
  contentClassName?: string;
};

/**
 * Surface + island composition: island first (nav/categories), then primary pane.
 * Stagger: island fades slightly before the content pane.
 */
export function SurfaceIslandLayout({
  island,
  children,
  className,
  islandClassName,
  contentClassName
}: SurfaceIslandLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <SurfaceShell fadeIn={!reduceMotion} className={cn("gap-3", className)}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
        <IslandCard
          fadeIn={!reduceMotion}
          className={cn("w-full md:w-52 md:shrink-0 lg:w-56", islandClassName)}
        >
          {island}
        </IslandCard>
        <motion.div
          data-slot="dashboard-surface-pane"
          className={cn("flex min-h-0 min-w-0 flex-1 flex-col", contentClassName)}
          initial={reduceMotion ? false : FADE.initial}
          animate={reduceMotion ? undefined : FADE.animate}
          transition={reduceMotion ? undefined : { ...FADE.transition, delay: 0.08 }}
        >
          {children}
        </motion.div>
      </div>
    </SurfaceShell>
  );
}
