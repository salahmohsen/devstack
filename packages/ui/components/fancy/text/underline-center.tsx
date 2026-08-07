"use client";

import { motion, type ValueAnimationTransition, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type CenterUnderlineProps = {
  /** Content to display and underline on hover. */
  children: ReactNode;
  className?: string;
  /** @default { duration: 0.25, ease: "easeInOut" } */
  transition?: ValueAnimationTransition;
  /** Underline height as a ratio of font size. @default 0.1 */
  underlineHeightRatio?: number;
  /** Gap below text as a ratio of font size. @default 0.01 */
  underlinePaddingRatio?: number;
  /**
   * When set, drives the underline from outside (e.g. parent card hover).
   * When omitted, the component reacts to its own pointer hover.
   */
  active?: boolean;
} & Omit<HTMLMotionProps<"span">, "children" | "animate" | "onHoverStart" | "onHoverEnd">;

/**
 * Hover underline that grows outward from the center.
 *
 * Uses an absolutely positioned bar sized relative to font-size (not CSS
 * text-decoration), so height/padding stay proportional across type scales.
 *
 * Width is animated directly for reliable self-hover and controlled (card) hover.
 *
 * @see https://fancycomponents.dev/docs/components/components/text/underline-animation
 */
function CenterUnderline({
  children,
  className,
  transition = { duration: 0.25, ease: "easeInOut" },
  underlineHeightRatio = 0.1,
  underlinePaddingRatio = 0.01,
  active,
  ...props
}: CenterUnderlineProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const controlled = active !== undefined;
  const [selfHovered, setSelfHovered] = useState(false);
  const show = controlled ? Boolean(active) : selfHovered;

  useEffect(() => {
    const updateUnderlineStyles = () => {
      const el = textRef.current;
      if (!el) return;
      const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(fontSize) || fontSize <= 0) return;
      el.style.setProperty("--underline-height", `${fontSize * underlineHeightRatio}px`);
      el.style.setProperty("--underline-padding", `${fontSize * underlinePaddingRatio}px`);
    };

    updateUnderlineStyles();
    window.addEventListener("resize", updateUnderlineStyles);
    return () => window.removeEventListener("resize", updateUnderlineStyles);
  }, [underlineHeightRatio, underlinePaddingRatio]);

  return (
    <motion.span
      className={cn("relative inline-block", className)}
      ref={textRef}
      onHoverStart={controlled ? undefined : () => setSelfHovered(true)}
      onHoverEnd={controlled ? undefined : () => setSelfHovered(false)}
      {...props}
    >
      <span>{children}</span>
      {/* span: valid inside <p>/<a>; left 50% + -translate-x-1/2 grows from center */}
      <motion.span
        className="pointer-events-none absolute left-1/2 block -translate-x-1/2 bg-current"
        style={{
          height: "var(--underline-height, 0.1em)",
          bottom: "calc(-1 * var(--underline-padding, 0.01em))",
          transformOrigin: "center"
        }}
        initial={false}
        animate={{ width: show ? "100%" : 0 }}
        transition={transition}
        aria-hidden
      />
    </motion.span>
  );
}

CenterUnderline.displayName = "CenterUnderline";

export { CenterUnderline };
