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
  /** Content measure node — natural card height, ignoring slot min-height. */
  contentRef?: (node: HTMLDivElement | null) => void;
};

/**
 * Sticky deck card: equal slot heights + opaque fill so only the TOP edges peek
 * (no bottom leak of taller cards behind shorter ones).
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
  contentRef
}: StickyStackCardProps) {
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    // Equal min-height slots: every sticky layer is as tall as the tallest card.
    // overflow-hidden + bg-card plate: nothing from behind shows under a shorter front.
    // top: inset + i * step → stick below chrome, later cards lower in the pile.
    // mb-6: list spacing between projects.
    <div
      className="sticky mb-6 w-full shrink-0 self-start overflow-hidden last:mb-0"
      style={{
        top: STICK_INSET_PX + i * STACK_STEP_PX,
        zIndex: i + 1,
        minHeight: slotMinHeight > 0 ? slotMinHeight : undefined
      }}
    >
      {/* Occlusion plate matches Card surface so short slots fully cover taller backs. */}
      <div className="absolute inset-0 bg-card" aria-hidden />
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
  itemCount: number;
};

function StickyCardStackBody({ children, className, scrollContainer, itemCount }: StackBodyProps) {
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
  // Depend on itemCount (stable) not `children` identity, which re-creates every render.
  useLayoutEffect(() => {
    const measure = () => {
      const heights = contentRefs.current.slice(0, count).map((el) => el?.offsetHeight ?? 0);
      const maxH = Math.max(0, ...heights);
      setSlotMinHeight((prev) => (prev === maxH ? prev : maxH));

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
  }, [count, itemCount]);

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
 * Always uses StickyCardStackBody; ScrollArea binding is optional after mount.
 *
 * @see https://skiper-ui.com/v1/skiper16
 */
function StickyCardStack({ children, className }: StickyCardStackProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  /** True once we know whether a ScrollArea viewport exists (may still be false). */
  const [hasScrollContainer, setHasScrollContainer] = useState(false);
  const items = Children.toArray(children).filter(Boolean);

  // Bind ScrollArea viewport once available (layout phase). Body still mounts
  // immediately so there is no plain-list flash before sticky mode.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewport = host.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    scrollRef.current = viewport;
    setHasScrollContainer(Boolean(viewport));
  }, []);

  return (
    <div ref={hostRef} className="w-full">
      <StickyCardStackBody
        className={className}
        scrollContainer={hasScrollContainer ? scrollRef : undefined}
        itemCount={items.length}
      >
        {children}
      </StickyCardStackBody>
    </div>
  );
}

export { StickyCardStack, StickyStackCard };
