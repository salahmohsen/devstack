"use client";

import { motion, useAnimate } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type NativeMarqueeItem = {
  id: string;
  icon?: ReactNode;
  label: string;
  /**
   * Optional fully custom chip. When set, replaces the default icon+label pill
   * (and `itemClassName` is not applied to the outer `<li>`).
   */
  content?: ReactNode;
};

export type NativeMarqueeProps = {
  className?: string;
  /**
   * Relative speed (higher = faster). Default 10.
   * Mapped to a fixed pixel velocity so short and long tracks scroll at the same visual rate
   * (duration scales with content length — avoids “more chips = faster” for %-based loops).
   */
  speed?: number;
  items: NativeMarqueeItem[];
  gap?: number;
  isVertical?: boolean;
  reverse?: boolean;
  pauseOnHover?: boolean;
  pauseOnTouch?: boolean;
  /** Optional class for each chip (default matches TripleD pill style). */
  itemClassName?: string;
};

/** Pixels/second at `speed={1}`. speed=2.5 → 10px/s; speed=10 → 40px/s. */
const PX_PER_SECOND_PER_SPEED = 4;

/**
 * Native Marquee from @uitripled (Base UI variant).
 * https://ui.tripled.work/components/native-marquee
 */
function NativeMarquee({
  className,
  speed = 10,
  gap = 2,
  isVertical = false,
  reverse = false,
  pauseOnHover = false,
  pauseOnTouch = false,
  items,
  itemClassName
}: NativeMarqueeProps) {
  const { containerRef, marqueeRef, multiplier, isMounted } = useMarquee({
    isVertical
  });

  const [scope1, animate1] = useAnimate();
  const [scope2, animate2] = useAnimate();
  const anim1Ref = useRef<{ pause: () => void; play: () => void; stop: () => void } | null>(null);
  const anim2Ref = useRef<{ pause: () => void; play: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (!isMounted || !scope1.current || !scope2.current) return;

    const axis = isVertical ? "y" : "x";
    const pxPerSecond = Math.max(speed * PX_PER_SECOND_PER_SPEED, 1);

    const stop = () => {
      anim1Ref.current?.stop();
      anim2Ref.current?.stop();
      anim1Ref.current = null;
      anim2Ref.current = null;
    };

    const start = () => {
      if (!scope1.current || !scope2.current) return;
      stop();

      // Distance = full track size. %-based duration made wider tracks (more chips)
      // finish a loop in the same time → higher pixel velocity. Scale by pixels instead.
      const distance = isVertical ? scope1.current.offsetHeight : scope1.current.offsetWidth;
      if (distance <= 0) return;

      const duration = distance / pxPerSecond;
      const from = reverse ? -distance : 0;
      const to = reverse ? 0 : -distance;

      anim1Ref.current = animate1(
        scope1.current,
        { [axis]: [from, to] },
        { duration, ease: "linear", repeat: Infinity }
      );
      anim2Ref.current = animate2(
        scope2.current,
        { [axis]: [from, to] },
        { duration, ease: "linear", repeat: Infinity }
      );
    };

    const animationFrame = requestAnimationFrame(start);
    const resizeObserver = new ResizeObserver(() => {
      start();
    });
    resizeObserver.observe(scope1.current);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      stop();
    };
  }, [
    animate1,
    animate2,
    isMounted,
    isVertical,
    items,
    multiplier,
    reverse,
    scope1,
    scope2,
    speed
  ]);

  const content = useMemo(
    () => (
      <ul className={cn("m-0 flex list-none items-center gap-2 p-0", isVertical && "flex-col")}>
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "shrink-0",
              item.content
                ? null
                : cn(
                    "flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm whitespace-nowrap text-muted-foreground",
                    "hover:border-foreground/20 hover:bg-muted",
                    isVertical && "w-full justify-center",
                    itemClassName
                  )
            )}
          >
            {item.content ?? (
              <>
                {item.icon}
                {item.label}
              </>
            )}
          </li>
        ))}
      </ul>
    ),
    [isVertical, itemClassName, items]
  );

  const copies = useCallback(
    (count: number) => {
      const arraySize = count >= 0 ? count : 0;
      return [...Array(arraySize)].map((_, i) => (
        // pointer-events-none: only the primary track should open hover cards / pause
        <span key={i} aria-hidden="true" className="pointer-events-none shrink-0">
          {content}
        </span>
      ));
    },
    [content]
  );

  const pause = () => {
    anim1Ref.current?.pause();
    anim2Ref.current?.pause();
  };

  const resume = () => {
    anim1Ref.current?.play();
    anim2Ref.current?.play();
  };

  const hoverProps = pauseOnHover ? { onMouseEnter: pause, onMouseLeave: resume } : {};
  const touchProps = pauseOnTouch ? { onTouchStart: pause, onTouchEnd: resume } : {};

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex overflow-hidden",
        isVertical ? "h-full shrink-0 grow-0 flex-col" : "w-full max-w-full min-w-0",
        className
      )}
      {...hoverProps}
      {...touchProps}
    >
      <motion.div ref={scope1}>
        <div
          className={cn("flex min-w-min shrink-0 grow-0 basis-auto", isVertical && "flex-col")}
          style={{
            marginRight: isVertical ? 0 : `${gap}px`,
            marginBottom: isVertical ? `${gap}px` : 0,
            gap: `${gap}px`
          }}
        >
          <span ref={marqueeRef} className="shrink-0">
            {content}
          </span>
          {copies(multiplier - 1)}
        </div>
      </motion.div>
      <motion.div ref={scope2}>
        <div
          className={cn("flex min-w-min shrink-0 grow-0 basis-auto", isVertical && "flex-col")}
          aria-hidden="true"
          style={{
            marginRight: isVertical ? 0 : `${gap}px`,
            marginBottom: isVertical ? `${gap}px` : 0,
            gap: `${gap}px`
          }}
        >
          {copies(multiplier)}
        </div>
      </motion.div>
    </div>
  );
}

function useMarquee({ isVertical = false }: { isVertical?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLSpanElement>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  const calculateMultiplier = useCallback(() => {
    if (!containerRef.current || !marqueeRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const marqueeRect = marqueeRef.current.getBoundingClientRect();

    if (isVertical) {
      const scale = Math.ceil(containerRect.height / marqueeRect.height);
      setMultiplier(marqueeRect.height < containerRect.height ? scale : 1);
    } else {
      const scale = Math.min(Math.ceil(containerRect.width / marqueeRect.width), 20);
      setMultiplier(marqueeRect.width < containerRect.width ? scale : 1);
    }
  }, [isVertical]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    calculateMultiplier();
    if (marqueeRef.current && containerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        calculateMultiplier();
      });
      resizeObserver.observe(marqueeRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [calculateMultiplier, isMounted]);

  return { containerRef, marqueeRef, multiplier, isMounted };
}

function SideFadeGradients({
  isVertical = false,
  /** Soft edge size (width for horizontal, height for vertical). */
  sizeClassName = isVertical ? "h-24" : "w-24",
  /** Gradient start color utility, e.g. `from-background` or `from-card`. */
  fromClassName = "from-background",
  className
}: {
  isVertical?: boolean;
  sizeClassName?: string;
  fromClassName?: string;
  className?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute z-10 to-transparent",
          isVertical
            ? cn("inset-x-0 top-0 bg-linear-to-b", sizeClassName, fromClassName)
            : cn("inset-y-0 left-0 bg-linear-to-r", sizeClassName, fromClassName),
          className
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute z-10 to-transparent",
          isVertical
            ? cn("inset-x-0 bottom-0 bg-linear-to-t", sizeClassName, fromClassName)
            : cn("inset-y-0 right-0 bg-linear-to-l", sizeClassName, fromClassName),
          className
        )}
      />
    </>
  );
}

export { NativeMarquee, useMarquee, SideFadeGradients };
