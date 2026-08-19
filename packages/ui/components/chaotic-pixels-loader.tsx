"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { usePixelColumns } from "@tsu-stack/ui/hooks/use-pixel-columns";
import { cn } from "@tsu-stack/ui/lib/utils";

type ChaoticPixelsLoaderProps = {
  className?: string;
  /** Accessible status label (default: “Loading more”). */
  label?: string;
};

type PixelConfig = {
  id: number;
  delay: number;
  duration: number;
  opacity: number;
  /** 0–1 mix amount for primary → transparent. */
  mix: number;
};

const PIXEL_ROWS = 2;
const MAX_PIXEL_COLUMNS = 140;

/** Deterministic “random” from id — stable across SSR/CSR. */
function pixelConfig(id: number): PixelConfig {
  const n = Math.sin(id * 12.9898) * 43758.5453;
  const frac = n - Math.floor(n);
  return {
    id,
    delay: Math.floor(frac * 700),
    duration: 1.2 + frac * 1.5,
    opacity: 0.38 + frac * 0.62,
    mix: 0.45 + frac * 0.5
  };
}

const PIXEL_POOL: PixelConfig[] = Array.from({ length: MAX_PIXEL_COLUMNS * PIXEL_ROWS }, (_, id) =>
  pixelConfig(id)
);

/**
 * Full-width chaotic dots strip for infinite-scroll / table loading states.
 * Adapted from Morphin’s Chaotic Dots Loader (Users demo loader only — not the dump).
 *
 * @see https://morphin.dev/components/chaotic-dots-loader-for-data-tables
 */
export function ChaoticPixelsLoader({
  className,
  label = "Loading more"
}: ChaoticPixelsLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const pixelColumns = usePixelColumns(rootRef, { max: MAX_PIXEL_COLUMNS });
  const pixels = PIXEL_POOL.slice(0, pixelColumns * PIXEL_ROWS);

  return (
    <div
      ref={rootRef}
      // Live loading region (ARIA); <output> is for calculation results.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- status live region
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("grid w-full grid-rows-2 gap-0.5 px-2 py-1", className)}
      style={{ gridTemplateColumns: `repeat(${pixelColumns}, minmax(0, 1fr))` }}
    >
      {pixels.map((pixel) => (
        <motion.span
          key={pixel.id}
          className="block aspect-square rounded-full"
          initial={reducedMotion ? false : { opacity: pixel.opacity * 0.45 }}
          animate={
            reducedMotion
              ? { opacity: pixel.opacity }
              : {
                  opacity: [
                    pixel.opacity * 0.42,
                    pixel.opacity,
                    pixel.opacity * 0,
                    pixel.opacity * 0.9
                  ]
                }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  delay: pixel.delay / 1000,
                  duration: pixel.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut"
                }
          }
          style={{
            backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(pixel.mix * 100)}%, transparent)`
          }}
        />
      ))}
    </div>
  );
}
