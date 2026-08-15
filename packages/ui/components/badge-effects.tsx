"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type BadgeGlowClasses = {
  icon: string;
  border: string;
  soft: string;
  mid: string;
  line: string;
};

export type BadgeGlowVariant =
  | "default"
  | "brand"
  | "destructive"
  | "error"
  | "info"
  | "outline"
  | "secondary"
  | "success"
  | "warning";

export const BADGE_GLOW_VARS: Record<BadgeGlowVariant, string> = {
  default:
    "[--btn-glow:rgba(24,24,27,0.2)] [--btn-glow-line:rgba(24,24,27,0.22)] dark:[--btn-glow:rgba(250,250,250,0.45)] dark:[--btn-glow-line:rgba(250,250,250,0.7)]",
  brand: "[--btn-glow:rgba(99,102,241,0.7)] [--btn-glow-line:rgba(99,102,241,0.95)]",
  destructive: "[--btn-glow:rgba(239,68,68,0.7)] [--btn-glow-line:rgba(239,68,68,0.95)]",
  error: "[--btn-glow:rgba(239,68,68,0.65)] [--btn-glow-line:rgba(239,68,68,0.95)]",
  info: "[--btn-glow:rgba(14,165,233,0.65)] [--btn-glow-line:rgba(14,165,233,0.95)]",
  outline:
    "[--btn-glow:rgba(113,113,122,0.18)] [--btn-glow-line:rgba(113,113,122,0.22)] dark:[--btn-glow:rgba(250,250,250,0.35)] dark:[--btn-glow-line:rgba(250,250,250,0.55)]",
  secondary:
    "[--btn-glow:rgba(113,113,122,0.2)] [--btn-glow-line:rgba(113,113,122,0.24)] dark:[--btn-glow:rgba(250,250,250,0.35)] dark:[--btn-glow-line:rgba(250,250,250,0.55)]",
  success: "[--btn-glow:rgba(34,197,94,0.65)] [--btn-glow-line:rgba(34,197,94,0.95)]",
  warning: "[--btn-glow:rgba(245,158,11,0.65)] [--btn-glow-line:rgba(245,158,11,0.95)]"
};

export const BADGE_GLOW: Record<BadgeGlowVariant, BadgeGlowClasses> = {
  default: {
    icon: "text-primary",
    border: "border-primary/20",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(24,24,27,0.55)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(250,250,250,0.55)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(24,24,27,0.4)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(250,250,250,0.4)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
  },
  brand: {
    icon: "text-brand",
    border: "border-brand/35",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(99,102,241,0.9)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(99,102,241,0.7)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(99,102,241,0.95)_0%,transparent_100%)]"
  },
  destructive: {
    icon: "text-red-700 dark:text-red-300",
    border: "border-red-500/40",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(239,68,68,0.95)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(239,68,68,0.8)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(239,68,68,0.95)_0%,transparent_100%)]"
  },
  error: {
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(239,68,68,0.9)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(239,68,68,0.75)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(239,68,68,0.95)_0%,transparent_100%)]"
  },
  info: {
    icon: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(14,165,233,0.9)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(14,165,233,0.75)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(14,165,233,0.95)_0%,transparent_100%)]"
  },
  outline: {
    icon: "text-foreground",
    border: "border-primary/20",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(113,113,122,0.45)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(113,113,122,0.3)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
  },
  secondary: {
    icon: "text-secondary-foreground",
    border: "border-border/80",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(113,113,122,0.5)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(113,113,122,0.35)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
  },
  success: {
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-500/30",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(34,197,94,0.9)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(34,197,94,0.75)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(34,197,94,0.95)_0%,transparent_100%)]"
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    soft: "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(245,158,11,0.9)_0%,transparent_70%)]",
    mid: "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(245,158,11,0.75)_0%,transparent_70%)]",
    line: "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgba(245,158,11,0.95)_0%,transparent_100%)]"
  }
};

export const BADGE_ICON_VARIANTS: Variants = {
  hidden: { scale: 0.35, opacity: 0, rotate: -25 },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { duration: 0.32, ease: [0.175, 0.885, 0.32, 1.275] }
  },
  exit: {
    scale: 0.35,
    opacity: 0,
    rotate: 18,
    transition: { duration: 0.18, ease: "easeIn" }
  }
};

const LETTER_VARIANTS: Variants = {
  hidden: { y: -8, opacity: 0 },
  visible: (i: number) => {
    return {
      y: 0,
      opacity: 1,
      transition: {
        delay: Math.min(i * 0.012, 0.18),
        duration: 0.18,
        ease: [0.215, 0.61, 0.355, 1]
      }
    };
  }
};

export function BadgeTopGlow({
  variant,
  size = "default"
}: {
  variant: BadgeGlowVariant;
  size?: "sm" | "default" | "lg";
}) {
  const g = BADGE_GLOW[variant];
  const compact = size === "sm";
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-[10%] left-[10%] opacity-55",
          compact ? "-top-1 h-2 blur-xs" : "-top-2 h-4 blur-[7px]",
          g.soft
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-[22%] left-[22%] opacity-75",
          compact ? "-top-0.5 h-1.5 blur-[2px]" : "-top-1 h-2 blur-[3.5px]",
          g.mid
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 right-[28%] left-[28%] h-px opacity-50 dark:opacity-90",
          g.line
        )}
      />
    </>
  );
}

export function BadgeAnimatedLabel({
  text,
  id,
  reduceMotion,
  animateOnMount = false
}: {
  text: string;
  id: string;
  reduceMotion: boolean;
  animateOnMount?: boolean;
}) {
  if (reduceMotion) {
    return <span>{text}</span>;
  }
  return (
    <motion.span className="inline-flex overflow-visible">
      {text.split("").map((char, i) => (
        <motion.span
          key={`${id}-${i}`}
          custom={i}
          variants={LETTER_VARIANTS}
          initial={animateOnMount ? "hidden" : false}
          animate="visible"
          className="inline-block whitespace-pre"
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Letter-stagger when the text changes; first paint stays still. */
export function BadgeLabel({
  text,
  animateOnMount = false
}: {
  text: string;
  animateOnMount?: boolean;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const prev = useRef(text);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    setAnimKey((n) => n + 1);
  }, [text]);

  return (
    <BadgeAnimatedLabel
      key={`${text}-${animKey}`}
      text={text}
      id={`${text}-${animKey}`}
      reduceMotion={reduceMotion}
      animateOnMount={animateOnMount || animKey > 0}
    />
  );
}
