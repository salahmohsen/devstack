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
  /** Compact header pill, full-width field footer, or native button chrome. */
  layout?: "pill" | "stretch" | "default";
};

/** Inline solving orb — shared by workflow pills and AI job toasts. */
export function WorkflowSolvingOrb({ className }: { className?: string }) {
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
 * Glossy AI job trigger: idle glass pill, running solving orb + step + cancel.
 * Shared by Scan job alerts, Detect stacks, and Organize.
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
  layout = "pill"
}: AiFlowTriggerProps) {
  const pill = layout === "pill";
  const stretch = layout === "stretch";
  const liveLabel = stepLabel?.trim() ?? runningFallback;
  const compact = size === "sm";

  if (running) {
    return (
      <Group
        className={cn(
          "shrink-0 items-stretch",
          compact ? "h-8 sm:h-7" : "h-9 sm:h-8",
          stretch && "w-full min-w-0",
          pill && "max-w-full",
          className
        )}
        aria-label={liveLabel}
      >
        <Button
          type="button"
          size={size}
          disabled
          className={cn(
            "pointer-events-none h-full justify-start",
            stretch ? "min-w-0 flex-1 justify-center rounded-none" : "shrink-0",
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
                  className={cn(
                    "h-full",
                    stretch && "rounded-none",
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
      disabled={disabled}
      onClick={onStart}
      className={cn(stretch && "w-full rounded-none", pill && "rounded-full", className)}
    >
      {icon}
      {idleLabel}
    </Button>
  );
}
