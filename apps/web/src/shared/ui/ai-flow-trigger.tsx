"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { ThinkingOrb } from "thinking-orbs";

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
 * Title + step = two `text-sm leading-snug` lines + `gap-0.5`.
 * Solving orb draws at 0.82 of the canvas, so the box is that block / 0.82
 * and the globe sits on the copy. Keep in lockstep with `AiJobRunningToastBody`.
 */
const TOAST_ORB_BOX_CLASS = "size-[calc((2*0.875rem*1.375+0.125rem)/0.82)]";

/** Inline solving orb — shared by workflow pills and AI job toasts. */
export function WorkflowSolvingOrb({
  className,
  size = "inline"
}: {
  className?: string;
  /** `toast` uses the 64px preset CSS-scaled to the title + step block. */
  size?: "inline" | "toast";
}) {
  if (size === "toast") {
    return (
      <span className={cn("relative block shrink-0", TOAST_ORB_BOX_CLASS, className)} aria-hidden>
        <ThinkingOrb
          state="solving"
          size={64}
          theme="auto"
          className="block size-full"
          style={{ width: "100%", height: "100%" }}
        />
      </span>
    );
  }

  return (
    <ThinkingOrb
      state="solving"
      size={20}
      theme="auto"
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
                  variant="destructive"
                  aria-label="Cancel"
                  onClick={onCancel}
                  className={cn("h-full", stretch && flush, pill && "rounded-full rounded-s-none")}
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
