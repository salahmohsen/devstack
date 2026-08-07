"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";

import { TextFlip } from "@tsu-stack/ui/components/fancy/text";
import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Split a multi-line profile summary into sentences that flip one-by-one
 * with a one-shot shimmer (chanhdai.com under-name effect).
 *
 * Each non-empty line of `summary` is one flip item. Shimmer runs once per
 * sentence, then the next line transitions in.
 */
export function FlipSummary({ summary, className }: { summary: string; className?: string }) {
  const lines = useMemo(
    () =>
      summary
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [summary]
  );

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.2 });
  const reduceMotion = useReducedMotion();

  if (lines.length === 0) {
    return null;
  }

  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
  const shimmerClass =
    "shimmer font-mono text-sm text-balance text-muted-foreground shimmer-duration-1500 shimmer-once";

  // Prefer reduced-motion / single line: static text, still shimmer once when allowed.
  if (reduceMotion || lines.length === 1) {
    return (
      <div ref={ref} className={cn(className)}>
        <p className={cn(shimmerClass, reduceMotion && "shimmer-none")}>{lines[0]}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Reserve height for the longest line so flips don't shift layout */}
      <span className="invisible block font-mono text-sm text-balance" aria-hidden>
        {longest}
      </span>
      <div className="absolute inset-0">
        <TextFlip
          key={summary}
          className={cn(shimmerClass, "block w-full")}
          interval={3}
          play={isInView}
        >
          {lines}
        </TextFlip>
      </div>
    </div>
  );
}
