import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Transition,
  type Variants
} from "motion/react";
import { Children, useEffect, useState, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

const defaultVariants: Variants = {
  initial: { y: "-20%", opacity: 0, filter: "blur(1px)" },
  animate: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)"
  },
  exit: {
    y: "40%",
    opacity: 0,
    filter: "blur(1px)",
    transition: { ease: "easeOut" }
  }
};

type MotionTag = "p" | "span" | "div" | "code";

export type TextFlipProps = {
  /**
   * Motion element to render.
   * @default "p"
   */
  as?: MotionTag;
  className?: string;
  /** Items to cycle through (one visible at a time). */
  children: ReactNode[];
  /**
   * Seconds between each flip.
   * @default 2
   */
  interval?: number;
  /**
   * Motion transition for enter/exit.
   * @default { duration: 0.3 }
   */
  transition?: Transition;
  /** Motion variants for enter/exit animations. */
  variants?: Variants;
  /** When false, keeps the current item without advancing. @default true */
  play?: boolean;
  /** Called with the new index after each flip. */
  onIndexChange?: (index: number) => void;
} & Omit<HTMLMotionProps<"p">, "children" | "as" | "transition" | "variants">;

/**
 * Cycles through children with a short blur/slide exit-enter (chanhdai-style text flip).
 * Remounts the active child on each flip so one-shot CSS animations (e.g. `shimmer-once`) restart.
 *
 * @see https://chanhdai.com/
 */
function TextFlip({
  as = "p",
  className,
  children,
  interval = 2,
  transition = { duration: 0.3 },
  variants = defaultVariants,
  play = true,
  onIndexChange,
  ...props
}: TextFlipProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);
  const itemCount = items.length;
  const activeIndex = itemCount === 0 ? 0 : currentIndex % itemCount;

  useEffect(() => {
    if (!play || itemCount <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % itemCount;
        onIndexChange?.(next);
        return next;
      });
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [play, interval, itemCount, onIndexChange]);

  if (itemCount === 0) {
    return null;
  }

  const MotionComponent = motion[as];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <MotionComponent
        key={activeIndex}
        className={cn("inline-block", className)}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        variants={variants}
        {...props}
      >
        {items[activeIndex]}
      </MotionComponent>
    </AnimatePresence>
  );
}

export { TextFlip };
