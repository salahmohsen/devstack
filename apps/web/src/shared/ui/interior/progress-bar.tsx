"use client";
// https://www.interior.dev/docs/progress-bar — Motion only, no Radix.

import { motion, useReducedMotion } from "motion/react";
import { type AriaAttributes } from "react";
import { useId } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

const FILL = { type: "spring", stiffness: 210, damping: 34, mass: 0.9 } as const;
const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const INSTANT = { duration: 0 } as const;

const FILL_CLASS =
  "bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(28,25,23,0.2)]";

export type ProgressBarProps = {
  value: number | null;
  max?: number;
  label?: string;
  pendingLabel?: string;
  completeLabel?: string;
  className?: string;
  /** Hide the built-in label + percent when the caller already shows them. */
  hideHeader?: boolean;
};

export function ProgressBar({
  value,
  max = 100,
  label = "Progress",
  pendingLabel = "Working",
  completeLabel = "Complete",
  className,
  hideHeader = false
}: ProgressBarProps) {
  const reduced = useReducedMotion();
  const labelId = useId();

  const indeterminate = value === null;
  const fraction = value === null || max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const percent = Math.round(fraction * 100);
  const complete = !indeterminate && fraction >= 1;

  const measured: AriaAttributes = indeterminate
    ? {}
    : {
        "aria-valuenow": Math.round(fraction * max * 100) / 100,
        "aria-valuetext": `${percent}%`
      };

  return (
    <div className={cn("w-full", className)}>
      {hideHeader ? (
        <span id={labelId} className="sr-only">
          {label}
        </span>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <span id={labelId} className="truncate text-[13px] font-medium text-foreground">
            {label}
          </span>
          <span aria-hidden className="grid shrink-0 justify-items-end text-muted-foreground">
            <motion.span
              className="col-start-1 row-start-1 text-[12px] leading-5 font-medium whitespace-nowrap"
              initial={false}
              animate={{ opacity: indeterminate ? 1 : 0 }}
              transition={reduced ? INSTANT : CROSSFADE}
            >
              {pendingLabel}
            </motion.span>
            <motion.span
              className="col-start-1 row-start-1 font-mono text-[12px] leading-5 font-medium whitespace-nowrap tabular-nums"
              initial={false}
              animate={{ opacity: indeterminate ? 0 : 1 }}
              transition={reduced ? INSTANT : CROSSFADE}
            >
              {percent}%
            </motion.span>
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        {...measured}
        className={cn(
          "rounded-lg bg-muted/80 p-0.5 shadow-[inset_0_1px_2px_rgba(28,25,23,0.1),inset_0_0_0_1px_rgba(28,25,23,0.06)]",
          !hideHeader && "mt-2"
        )}
      >
        <div className="relative h-2 overflow-hidden rounded-xs">
          <motion.span
            aria-hidden
            className={cn("absolute inset-0 block origin-left rounded-xs", FILL_CLASS)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: indeterminate ? 0 : fraction }}
            transition={reduced ? INSTANT : FILL}
          />

          {indeterminate && !reduced ? (
            <motion.span
              aria-hidden
              className={cn("absolute inset-y-0 left-0 block w-2/5 rounded-xs", FILL_CLASS)}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "250%", opacity: 1 }}
              transition={{
                x: { duration: 1.25, ease: "easeInOut", repeat: Infinity },
                opacity: { duration: 0.18 }
              }}
            />
          ) : null}
        </div>
      </div>

      <span aria-live="polite" className="sr-only">
        {complete ? completeLabel : indeterminate ? pendingLabel : ""}
      </span>
    </div>
  );
}
