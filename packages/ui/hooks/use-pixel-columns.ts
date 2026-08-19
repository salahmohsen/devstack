"use client";

import { useEffect, useState, type RefObject } from "react";

const DEFAULT_MIN = 24;
const DEFAULT_MAX = 140;
/** Approx cell width: aspect-square dots + gap-0.5 (~2px). */
const CELL_PX = 6;

/**
 * How many pixel columns fit in a container (or the window).
 * Used by {@link ChaoticPixelsLoader} so the strip scales with list width.
 */
export function usePixelColumns(
  containerRef?: RefObject<HTMLElement | null>,
  options?: { min?: number; max?: number; cellPx?: number }
): number {
  const min = options?.min ?? DEFAULT_MIN;
  const max = options?.max ?? DEFAULT_MAX;
  const cellPx = options?.cellPx ?? CELL_PX;
  const [pixelColumns, setPixelColumns] = useState(min);

  useEffect(() => {
    const measure = (width: number) => {
      const next = Math.min(max, Math.max(min, Math.floor(width / cellPx)));
      setPixelColumns((prev) => (prev === next ? prev : next));
    };

    const el = containerRef?.current;
    if (el) {
      measure(el.clientWidth);
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? el.clientWidth;
        measure(width);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }

    const updateFromWindow = () => {
      measure(window.innerWidth);
    };
    updateFromWindow();
    window.addEventListener("resize", updateFromWindow);
    return () => window.removeEventListener("resize", updateFromWindow);
  }, [containerRef, min, max, cellPx]);

  return pixelColumns;
}
