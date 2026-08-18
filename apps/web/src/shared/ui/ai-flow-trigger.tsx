"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { type ReactNode } from "react";
import { ThinkingOrb, type OrbTheme } from "thinking-orbs";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

/** Fast whole-label swap — letter stagger is too slow for long step copy. */
function RunningStepLabel({ text }: { text: string }) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <span className="relative inline-grid justify-items-start overflow-visible">
      <AnimatePresence mode="sync" initial={false}>
        <motion.span
          key={text}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={reduceMotion ? false : { opacity: 0, y: 5, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export type AiFlowTriggerProps = {
  idleLabel: string;
  icon?: ReactNode;
  running: boolean;
  /** Live job step while `running`. Falls back to `runningFallback`. */
  stepLabel?: string | null;
  runningFallback?: string;
  onStart: () => void;
  onCancel: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  /** Native button chrome, full-width field footer, or compact pill. */
  layout?: "default" | "stretch" | "pill";
};

/**
 * ThinkingOrb ink follows the **substrate**, not the document theme.
 * Island / inverted pills use `bg-foreground` — opposite of page chrome — so
 * `auto` paints invisible dots. `inverted` flips light↔dark for that case.
 */
function useOrbTheme(surface: "default" | "inverted"): OrbTheme {
  const { resolvedTheme } = useTheme();
  if (surface === "default") return "auto";
  const pageDark = resolvedTheme === "dark";
  // Dark page → light foreground pill → need dark ink (`light` theme).
  // Light page → dark foreground pill → need light ink (`dark` theme).
  return pageDark ? "light" : "dark";
}

/** Inline solving orb — shared by workflow pills, former AI toast, and the island. */
export function WorkflowSolvingOrb({
  className,
  size = "inline",
  surface = "default",
  paused = false
}: {
  className?: string;
  /**
   * `inline` — 20px preset (flow triggers).
   * `toast` — native 64px preset (island / former AI toast). Never CSS-scale the
   * canvas: thinking-orbs tunes dots per size; stretching it looks pixelated.
   */
  size?: "inline" | "toast";
  /** `inverted` for `bg-foreground` chips (AI island running). */
  surface?: "default" | "inverted";
  /** Freeze on the current frame when the job has finished. */
  paused?: boolean;
}) {
  const theme = useOrbTheme(surface);

  return (
    <ThinkingOrb
      state="solving"
      size={size === "toast" ? 64 : 20}
      theme={theme}
      paused={paused}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}

/**
 * Page-level start trigger (glass). Idle glass button; running orb + step + cancel.
 * Shared by Find jobs now, Scan job alerts, Detect stacks, and Organize.
 */
export function AiFlowTrigger({
  idleLabel,
  icon,
  running,
  stepLabel,
  runningFallback = "Working…",
  onStart,
  onCancel,
  disabled = false,
  className,
  size = "default",
  layout = "default"
}: AiFlowTriggerProps) {
  const pill = layout === "pill";
  const stretch = layout === "stretch";
  const liveLabel = stepLabel?.trim() ?? runningFallback;
  const compact = size === "sm";
  const flush = "rounded-none before:rounded-none";

  if (running) {
    return (
      <Group
        className={cn(
          "shrink-0 items-stretch",
          compact ? "h-8 sm:h-7" : "h-9 sm:h-8",
          stretch && cn("w-full min-w-0", flush),
          pill && "max-w-full",
          className
        )}
        aria-label={liveLabel}
      >
        <Button
          type="button"
          size={size}
          variant="glass"
          disabled
          className={cn(
            "pointer-events-none h-full justify-start",
            stretch ? cn("min-w-0 flex-1 justify-center", flush) : "shrink-0",
            pill && "rounded-full rounded-e-none"
          )}
        >
          <WorkflowSolvingOrb />
          {stretch ? (
            <span className="min-w-0 truncate">{liveLabel}</span>
          ) : (
            <RunningStepLabel text={liveLabel} />
          )}
        </Button>
        <GroupSeparator />
        <TooltipProvider delay={0}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size={compact ? "icon-sm" : "icon"}
                  variant="glass-destructive"
                  aria-label="Cancel"
                  animate={false}
                  onClick={onCancel}
                  className={cn(
                    "h-full overflow-visible",
                    stretch && flush,
                    pill && "rounded-full rounded-s-none"
                  )}
                />
              }
            >
              <XIcon aria-hidden />
            </TooltipTrigger>
            <TooltipPopup>Cancel</TooltipPopup>
          </Tooltip>
        </TooltipProvider>
      </Group>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="glass"
      disabled={disabled}
      onClick={onStart}
      className={cn(stretch && cn("w-full", flush), pill && "rounded-full", className)}
    >
      {icon}
      {idleLabel}
    </Button>
  );
}
