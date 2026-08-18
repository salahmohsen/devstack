"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactElement } from "react";

import { useMediaQuery } from "@tsu-stack/ui/hooks/use-media-query";
import { cn } from "@tsu-stack/ui/lib/utils";

export type StatusMorphToggleProps = {
  /** Idle color + which opposite color to preview on hover. */
  active: boolean;
  className?: string;
  /**
   * Idle circle size. `sm` ≈ 8px (matches former LiveStatusDot size-2).
   * Morph scales proportionally (taller/narrower on hover).
   */
  size?: "sm" | "md";
  /**
   * Controlled hover from the parent pressable (preferred).
   * When set, do not attach mouse handlers on the morph — parent Button
   * owns hover so IconSwap’s hidden layer cannot steal events.
   */
  hovered?: boolean;
  /**
   * Keep the morph shape expanded (e.g. while a mutation is in flight)
   * even when not hovered. Color follows `active` (no opposite preview).
   */
  pending?: boolean;
};

const SIZE = {
  sm: { idle: 8, hoverW: 6, hoverH: 14 },
  md: { idle: 10, hoverW: 7, hoverH: 18 }
} as const;

/**
 * Presentational status morph (SmoothUI Dot Morph–inspired).
 * Not a button — parent owns press / aria-pressed / disabled.
 *
 * Prefer controlled `hovered` from the parent Button (same idea as icon-motion:
 * never depend on the icon hit box). Internal mouse handlers are only a
 * fallback when `hovered` is omitted.
 */
export function StatusMorphToggle({
  active,
  className,
  size = "sm",
  hovered: hoveredProp,
  pending = false
}: StatusMorphToggleProps): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const isHoverDevice = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [uncontrolledHovered, setUncontrolledHovered] = useState(false);
  const controlled = hoveredProp !== undefined;
  const isHovered = controlled ? Boolean(hoveredProp) : uncontrolledHovered;
  const dims = SIZE[size];

  const showMorph = pending || (!shouldReduceMotion && isHoverDevice && isHovered);

  const morph = showMorph
    ? { borderRadius: 999, width: dims.hoverW, height: dims.hoverH }
    : { borderRadius: 999, width: dims.idle, height: dims.idle };

  // Pending uses committed/optimistic `active` color; hover-only previews the opposite.
  const previewActive =
    pending || !(isHovered && isHoverDevice && !shouldReduceMotion) ? active : !active;

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      data-slot="status-morph-toggle"
      data-active={active ? "" : undefined}
      onMouseEnter={
        controlled
          ? undefined
          : () => {
              if (isHoverDevice) setUncontrolledHovered(true);
            }
      }
      onMouseLeave={controlled ? undefined : () => setUncontrolledHovered(false)}
    >
      <motion.span
        aria-hidden
        className={cn("inline-block", previewActive ? "bg-success" : "bg-destructive")}
        initial={false}
        animate={morph}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 600, damping: 22, duration: 0.25 }
        }
      />
    </span>
  );
}
