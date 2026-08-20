"use client";
// beui.dev/components/motion/range-slider

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "motion/react";
import { useEffect } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SPRING_GLIDE } from "@/shared/lib/ease";
import { TOUCH_GESTURE_CLASS } from "@/shared/lib/touch";
import { type SliderOptions, useSlider } from "@/shared/lib/use-slider";

const SPRING_BOUNCY = { type: "spring", stiffness: 500, damping: 14, mass: 0.7 } as const;

export type RangeSliderProps = {
  /** Render a tick dot at each step. */
  showTicks?: boolean;
  className?: string;
} & SliderOptions;

export function RangeSlider({ showTicks = true, className, ...options }: RangeSliderProps) {
  const reduce = useReducedMotion();
  const { percent, dragging, min, max, step, trackProps, sliderProps } = useSlider(options);

  const target = useMotionValue(percent);
  useEffect(() => {
    target.set(percent);
  }, [percent, target]);
  const smooth = useSpring(target, SPRING_GLIDE);
  const pos = reduce ? target : smooth;
  const left = useMotionTemplate`${pos}%`;
  const thumbX = useTransform(pos, (p) => `${-p}%`);

  const steps = Math.floor(Number(((max - min) / step).toFixed(6)));
  const ticks =
    showTicks && steps > 0 && steps <= 50
      ? Array.from({ length: steps + 1 }, (_, i) => Number((min + i * step).toFixed(6)))
      : [];

  return (
    <div
      {...trackProps}
      className={cn(
        "relative flex h-7 w-full touch-none items-center overflow-hidden rounded-lg bg-muted",
        TOUCH_GESTURE_CLASS,
        options.disabled ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <motion.div className="absolute inset-y-0 left-0 bg-foreground/15" style={{ width: left }} />

      <div className="pointer-events-none absolute inset-x-0.75 inset-y-0">
        {ticks.map((tick) => {
          const tickPercent = ((tick - min) / (max - min)) * 100;
          return (
            <span
              key={tick}
              className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
              style={{ left: `${tickPercent}%` }}
            />
          );
        })}
      </div>

      <motion.div
        {...sliderProps}
        animate={reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }}
        transition={SPRING_BOUNCY}
        className="absolute top-1/2 h-5 w-1.5 rounded-sm bg-foreground shadow-sm ring-foreground/30 outline-none ring-inset focus-visible:ring-4"
        style={{ left, x: thumbX, y: "-50%" }}
      />
    </div>
  );
}
