"use client";

import { AlertTriangleIcon, CheckCircleIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Badge } from "@tsu-stack/ui/components/badge";
import {
  BADGE_GLOW,
  BADGE_ICON_VARIANTS,
  type BadgeGlowVariant
} from "@tsu-stack/ui/components/badge-effects";
import { cn } from "@tsu-stack/ui/lib/utils";

export type StatusState = "pending" | "warning" | "failed" | "success";

export type StatusBadgeProps = {
  state?: StatusState;
  labels?: Partial<Record<StatusState, string>>;
  className?: string;
};

const DEFAULT_LABELS: Record<StatusState, string> = {
  pending: "Submitted",
  warning: "Changes unsaved",
  failed: "Failed",
  success: "Saved"
};

const STATE_TO_VARIANT: Record<StatusState, BadgeGlowVariant> = {
  pending: "warning",
  warning: "warning",
  failed: "error",
  success: "success"
};

/** @deprecated Use BADGE_GLOW from badge-effects. Kept for StatusSubmitButton. */
export const STATE_CLASSES = {
  pending: BADGE_GLOW.warning,
  warning: BADGE_GLOW.warning,
  failed: BADGE_GLOW.error,
  success: BADGE_GLOW.success
};

export const ICON_VARIANTS = BADGE_ICON_VARIANTS;

export function StatusStateIcon({
  state,
  reduceMotion
}: {
  state: StatusState;
  reduceMotion: boolean;
}) {
  const cls = STATE_CLASSES[state].icon;
  if (state === "pending") {
    return (
      <motion.span
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: "linear" }}
        className={cn("flex", cls)}
      >
        <LoaderIcon size={14} strokeWidth={2.5} />
      </motion.span>
    );
  }
  if (state === "warning") return <AlertTriangleIcon size={14} strokeWidth={2} className={cls} />;
  if (state === "failed") return <XCircleIcon size={14} strokeWidth={2} className={cls} />;
  return <CheckCircleIcon size={14} strokeWidth={2} className={cls} />;
}

function StatusBadge({ state = "success", labels, className }: StatusBadgeProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const label = { ...DEFAULT_LABELS, ...labels }[state];
  const variant = STATE_TO_VARIANT[state];

  return (
    <Badge
      variant={variant}
      animateLabel
      aria-label={label}
      className={cn("h-auto px-3 py-1.5 text-xs tracking-[0.01em]", className)}
      icon={
        <AnimatePresence mode="wait">
          <motion.span
            key={state}
            variants={reduceMotion ? undefined : BADGE_ICON_VARIANTS}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            exit={reduceMotion ? undefined : "exit"}
            className="absolute flex items-center"
          >
            <StatusStateIcon state={state} reduceMotion={reduceMotion} />
          </motion.span>
        </AnimatePresence>
      }
    >
      {label}
    </Badge>
  );
}

export { StatusBadge };
export type { BadgeGlowClasses as GlowClasses } from "@tsu-stack/ui/components/badge-effects";
