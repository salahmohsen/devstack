import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { htmlToText } from "@tsu-stack/core";
import { TextFlip } from "@tsu-stack/ui/components/fancy/text";
import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Turn a profile summary (plain multi-line text or rich HTML from TipTap)
 * into flip lines. Prefer block boundaries (`</p>`, `<br>`, etc.) so each
 * paragraph/sentence the author entered is one flip item.
 */
export function summaryToFlipLines(summary: string): string[] {
  const trimmed = summary.trim();
  if (!trimmed) return [];

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    // Split on block ends / hard breaks, then strip tags per chunk.
    const chunks = trimmed
      .split(/<\/(?:p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/i)
      .map((chunk) => htmlToText(chunk))
      .map((line) => line.trim())
      .filter(Boolean);
    if (chunks.length > 0) return chunks;
    // Fallback: whole document as one line of plain text
    const plain = htmlToText(trimmed);
    return plain ? [plain] : [];
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Split a multi-line (or multi-paragraph rich) profile summary into sentences
 * that flip one-by-one with a one-shot shimmer (chanhdai.com under-name effect).
 *
 * Each non-empty line / paragraph is one flip item.
 */
export function FlipSummary({
  summary,
  className,
  id
}: {
  summary: string;
  className?: string;
  id?: string;
}) {
  const lines = useMemo(() => summaryToFlipLines(summary), [summary]);

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.2 });
  const reduceMotion = useReducedMotion();
  const [shimmerSettled, setShimmerSettled] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setShimmerSettled(true), 1600);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  if (lines.length === 0) {
    return null;
  }

  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
  const settleShimmer = (event: { animationName: string }) => {
    if (event.animationName.includes("shimmer")) setShimmerSettled(true);
  };
  const shimmerClass = cn(
    "font-mono text-sm text-pretty text-muted-foreground",
    !reduceMotion && !shimmerSettled && "shimmer shimmer-duration-1500 shimmer-once"
  );

  // Prefer reduced-motion / single line: static text, still shimmer once when allowed.
  if (reduceMotion || lines.length === 1) {
    return (
      <div ref={ref} id={id} className={cn(className)}>
        <p className={shimmerClass} onAnimationEnd={settleShimmer}>
          {lines[0]}
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} id={id} className={cn("relative", className)}>
      {/* Reserve height for the longest line so flips don't shift layout */}
      <span className="invisible block font-mono text-sm text-pretty" aria-hidden>
        {longest}
      </span>
      <div className="absolute inset-0">
        <TextFlip
          key={lines.join("\n")}
          className={cn(shimmerClass, "block w-full")}
          interval={3}
          play={isInView}
          onAnimationEnd={settleShimmer}
        >
          {lines}
        </TextFlip>
      </div>
    </div>
  );
}
