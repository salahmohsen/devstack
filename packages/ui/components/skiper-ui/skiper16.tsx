"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Children, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Space from the scrollport top before the first card sticks.
 * Keeps the pile under the topbar/chrome with a little breathing room.
 */
const STICK_INSET_PX = 24;

/**
 * Vertical step (px) between stuck cards — deck fan: front lowest, earlier peek above.
 */
const STACK_STEP_PX = 16;

type StickyStackCardProps = {
  /** Card index in the stack (0-based). */
  i: number;
  progress: MotionValue<number>;
  /** Scroll progress range that drives this card's scale. */
  range: [number, number];
  /** Scale when progress reaches range end (earlier cards end smaller). */
  targetScale: number;
  /** Shared min-height (tallest content) so shorter fronts fully occlude taller backs. */
  slotMinHeight: number;
  children: ReactNode;
  className?: string;
  /** Sticky root (slot) — used for equal-height layout. */
  slotRef?: (node: HTMLDivElement | null) => void;
  /** Content measure node — natural card height, ignoring slot min-height. */
  contentRef?: (node: HTMLDivElement | null) => void;
};

/**
 * Sticky deck card: equal slot heights + opaque fill so only the TOP edges peek
 * (no bottom leak of taller cards behind shorter ones; no mid-body collision window).
 *
 * @see https://skiper-ui.com/v1/skiper16
 */
function StickyStackCard({
  i,
  progress,
  range,
  targetScale,
  slotMinHeight,
  children,
  className,
  slotRef,
  contentRef
}: StickyStackCardProps) {
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    // Equal min-height slots: every sticky layer is as tall as the tallest card.
    // overflow-hidden + bg-card plate: nothing from behind shows under a shorter front.
    // top: inset + i * step → stick below chrome, later cards lower in the pile.
    // mb-6: list spacing between projects.
    <div
      ref={slotRef}
      className="sticky mb-6 w-full shrink-0 self-start overflow-hidden last:mb-0"
      style={{
        top: STICK_INSET_PX + i * STACK_STEP_PX,
        zIndex: i + 1,
        minHeight: slotMinHeight > 0 ? slotMinHeight : undefined
      }}
    >
      {/* Occlusion plate — same surface as Card so short slots still fully cover. */}
      <div className="absolute inset-0 bg-background" aria-hidden />
      <motion.div
        style={{ scale }}
        className={cn(
          "relative w-full origin-top will-change-transform",
          "shadow-lg/10",
          className
        )}
      >
        <div ref={contentRef} className="w-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export type StickyCardStackProps = {
  children: ReactNode;
  className?: string;
};

type StackBodyProps = {
  children: ReactNode;
  className?: string;
  /** When set, progress is tracked against this scrollport (ScrollArea viewport). */
  scrollContainer?: RefObject<HTMLElement | null>;
};

function StickyCardStackBody({ children, className, scrollContainer }: StackBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** Tallest natural card height — applied as min-height on every sticky slot. */
  const [slotMinHeight, setSlotMinHeight] = useState(0);
  /** Height-weighted scale ranges (from natural content heights). */
  const [ranges, setRanges] = useState<[number, number][]>([]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    ...(scrollContainer ? { container: scrollContainer as RefObject<HTMLElement> } : {}),
    offset: ["start start", "end end"]
  });

  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;

  // Measure natural content heights → equal slot min-height + scale ranges.
  useLayoutEffect(() => {
    const measure = () => {
      const heights = contentRefs.current.slice(0, count).map((el) => el?.offsetHeight ?? 0);
      const maxH = Math.max(0, ...heights);
      setSlotMinHeight(maxH);

      const total = heights.reduce((sum, h) => sum + h, 0);
      if (total <= 0) {
        const step = count > 1 ? 1 / count : 1;
        setRanges(
          Array.from({ length: count }, (_, i) => [Math.min(i * step, 0.9), 1] as [number, number])
        );
        return;
      }

      let acc = 0;
      setRanges(
        heights.map((h) => {
          const start = Math.min(acc / total, 0.9);
          acc += h;
          return [start, 1] as [number, number];
        })
      );
    };

    measure();

    const ro = new ResizeObserver(measure);
    for (const el of contentRefs.current) {
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [count, children]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex w-full flex-col items-center justify-start", "pb-4", className)}
    >
      {items.map((child, i) => {
        const targetScale = Math.max(0.5, 1 - (count - i - 1) * 0.1);
        const fallbackStep = count > 1 ? 1 / count : 1;
        const range: [number, number] = ranges[i] ?? [Math.min(i * fallbackStep, 0.9), 1];

        return (
          <StickyStackCard
            key={(child as { key?: string | null })?.key ?? `p_${i}`}
            i={i}
            progress={scrollYProgress}
            range={range}
            targetScale={targetScale}
            slotMinHeight={slotMinHeight}
            contentRef={(node) => {
              contentRefs.current[i] = node;
            }}
          >
            {child}
          </StickyStackCard>
        );
      })}
    </div>
  );
}

/**
 * Scroll-linked sticky card stack (Skiper 16 / Card stack scroll).
 *
 * @see https://skiper-ui.com/v1/skiper16
 */
function StickyCardStack({ children, className }: StickyCardStackProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  /** null = not probed yet; true/false = whether a ScrollArea viewport was found */
  const [hasViewport, setHasViewport] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      setHasViewport(false);
      return;
    }
    const viewport = host.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    scrollRef.current = viewport;
    setHasViewport(Boolean(viewport));
  }, []);

  return (
    <div ref={hostRef} className="w-full">
      {hasViewport === null ? (
        <div className={cn("flex w-full flex-col gap-6", className)}>{children}</div>
      ) : (
        <StickyCardStackBody
          className={className}
          scrollContainer={hasViewport ? scrollRef : undefined}
        >
          {children}
        </StickyCardStackBody>
      )}
    </div>
  );
}

/** Demo export name from the original registry item. */
function Skiper16() {
  return null;
}

/** Alias matching the registry export name. */
const StickyCard_001 = StickyStackCard;

export { Skiper16, StickyCard_001, StickyCardStack, StickyStackCard };

/**
 * Skiper 16 StickyCard — React + Motion
 * Inspired rebuild for this monorepo (motion/react, ScrollArea-aware).
 *
 * License & Usage (upstream):
 * - Free to use and modify in personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 *
 * Author (upstream): @gurvinder-singh02 — https://gxuri.me
 * Demo: https://skiper-ui.com/v1/skiper16
 */
