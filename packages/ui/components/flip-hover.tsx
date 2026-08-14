"use client";

import { motion, type Easing, type Transition } from "motion/react";
import { type ReactNode } from "react";

const TEXT_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 1.3
} as Transition;

const FILL_EASE = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1] as Easing
} as Transition;

type FlipHoverLayersProps = {
  children: ReactNode;
  /**
   * When set, layers follow this boolean instead of a parent motion
   * `whileHover` / `whileFocus` variant.
   */
  hovered?: boolean;
};

/**
 * Navbar-style flip: rest label exits up, brand/foreground wash slides in,
 * inverted label lands. Same springs as public-scope MorphNavItem.
 */
export function FlipHoverLayers({ children, hovered }: FlipHoverLayersProps) {
  const controlled = hovered !== undefined;
  const animate = controlled ? (hovered ? "hover" : "initial") : undefined;

  return (
    <>
      <span className="relative z-0 inline-flex items-center justify-center gap-[inherit] whitespace-nowrap text-transparent">
        {children}
      </span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-2 flex items-center justify-center gap-[inherit]"
        initial={controlled ? false : { y: 0, scale: 1, rotate: 0 }}
        animate={animate}
        variants={{
          initial: { y: 0, scale: 1, rotate: 0 },
          hover: { y: -100, scale: 0.5, rotate: -30 }
        }}
        transition={TEXT_SPRING}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-1 w-full scale-x-150 overflow-hidden rounded-[inherit] bg-brand"
        initial={controlled ? false : { y: 100, rotate: -40 }}
        animate={animate}
        variants={{
          initial: { y: 100, rotate: -40 },
          hover: { y: 0, rotate: 0 }
        }}
        transition={FILL_EASE}
      >
        <motion.span
          className="absolute inset-0 bg-foreground"
          initial={controlled ? false : { y: 150, rotate: -60 }}
          animate={animate}
          variants={{
            initial: { y: 150, rotate: -60 },
            hover: { y: 0, rotate: 0 }
          }}
          transition={FILL_EASE}
        />
      </motion.span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-2 flex items-center justify-center gap-[inherit] text-background"
        initial={controlled ? false : { y: 180, rotate: -60, scale: 0.5 }}
        animate={animate}
        variants={{
          initial: { y: 180, rotate: -60, scale: 0.5 },
          hover: { y: 0, rotate: 0, scale: 1 }
        }}
        transition={TEXT_SPRING}
      >
        {children}
      </motion.span>
    </>
  );
}
