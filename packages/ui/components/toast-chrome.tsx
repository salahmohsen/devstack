"use client";

import { InfoIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type React from "react";

import {
  BADGE_GLOW,
  BADGE_GLOW_VARS,
  BADGE_ICON_VARIANTS,
  BadgeTopGlow,
  type BadgeGlowVariant
} from "@tsu-stack/ui/components/badge-effects";
import { StatusStateIcon, type StatusState } from "@tsu-stack/ui/components/status-badge";
import { cn } from "@tsu-stack/ui/lib/utils";

export type ToastTone = "default" | "success" | "error" | "warning" | "info" | "loading";

const TONE_TEXT: Record<ToastTone, string> = {
  default: "text-foreground",
  success: "text-success-foreground",
  error: "text-destructive-foreground",
  warning: "text-warning-foreground",
  info: "text-info-foreground",
  loading: "text-warning-foreground"
};

export function toastToneFromType(type?: string | null): ToastTone {
  switch (type) {
    case "success":
    case "error":
    case "warning":
    case "info":
    case "loading":
      return type;
    case undefined:
    case null:
    default:
      return "default";
  }
}

export function toastGlowVariant(tone: ToastTone): BadgeGlowVariant {
  switch (tone) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "warning":
    case "loading":
      return "warning";
    case "info":
      return "info";
    case "default":
      return "default";
  }
}

export function toastGlowSurfaceClass(tone: ToastTone): string {
  const glow = toastGlowVariant(tone);
  return cn(
    "bg-background/90 shadow-xs/5 backdrop-blur-md not-dark:bg-clip-padding",
    BADGE_GLOW[glow].border,
    BADGE_GLOW_VARS[glow],
    TONE_TEXT[tone]
  );
}

/** Same inner wash + hairline + top bloom as Button. */
export function ToastGlowChrome({
  variant,
  size = "lg"
}: {
  variant: BadgeGlowVariant;
  size?: "sm" | "default" | "lg";
}): React.ReactElement {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-[22%] left-[22%] h-px bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
      />
      <BadgeTopGlow variant={variant} size={size} />
    </>
  );
}

function ToastToneGlyph({
  tone,
  reduceMotion
}: {
  tone: ToastTone;
  reduceMotion: boolean;
}): React.ReactElement | null {
  if (tone === "default") return null;
  if (tone === "info") {
    return <InfoIcon aria-hidden className={cn("size-3.5", BADGE_GLOW.info.icon)} />;
  }
  const state: StatusState =
    tone === "loading"
      ? "pending"
      : tone === "error"
        ? "failed"
        : tone === "success"
          ? "success"
          : "warning";
  return <StatusStateIcon state={state} reduceMotion={reduceMotion} />;
}

/** Animated status glyph for Sonner toast types. */
export function ToastStateGlyph({ tone }: { tone: ToastTone }): React.ReactElement {
  const reduceMotion = Boolean(useReducedMotion());
  const glyph = <ToastToneGlyph tone={tone} reduceMotion={reduceMotion} />;

  return (
    <motion.span
      variants={reduceMotion ? undefined : BADGE_ICON_VARIANTS}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative flex size-4 items-center justify-center"
    >
      {glyph}
    </motion.span>
  );
}

export function ToastTypeIcon({ type }: { type?: string | null }): React.ReactElement | null {
  const reduceMotion = Boolean(useReducedMotion());
  const tone = toastToneFromType(type);
  if (tone === "default") return null;
  return (
    <motion.span
      variants={reduceMotion ? undefined : BADGE_ICON_VARIANTS}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative flex size-4 shrink-0 items-center justify-center"
    >
      <ToastToneGlyph tone={tone} reduceMotion={reduceMotion} />
    </motion.span>
  );
}

/** Sonner root classes. `!` beats sonner's styled `background` shorthand. */
export const sonnerToastClassName = cn(
  "cn-toast overflow-visible bg-background/90! text-foreground backdrop-blur-md not-dark:bg-clip-padding",
  // Sonner locks `height` to a stale --initial-height on hover/expand and
  // transitions it — that is the toast "growing" on hover.
  "transition-[transform,opacity,box-shadow]! data-[expanded=true]:h-auto!",
  "bg-[radial-gradient(ellipse_40%_50%_at_50%_0%,var(--btn-glow-line)_0%,transparent_100%),radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]!",
  "bg-size-[56%_1px,100%_100%]! bg-position-[center_top,center]! bg-no-repeat!",
  "shadow-[0_-10px_20px_-8px_var(--btn-glow),0_1px_2px_rgb(0_0_0/0.05)]!",
  BADGE_GLOW_VARS.default,
  "border-primary/20!",
  "data-[type=success]:border-green-500/30! data-[type=success]:text-success-foreground!",
  "data-[type=success]:[--btn-glow-line:rgba(34,197,94,0.95)] data-[type=success]:[--btn-glow:rgba(34,197,94,0.65)]",
  "data-[type=error]:border-red-500/30! data-[type=error]:text-destructive-foreground!",
  "data-[type=error]:[--btn-glow-line:rgba(239,68,68,0.95)] data-[type=error]:[--btn-glow:rgba(239,68,68,0.65)]",
  "data-[type=warning]:border-amber-500/30! data-[type=warning]:text-warning-foreground!",
  "data-[type=warning]:[--btn-glow-line:rgba(245,158,11,0.95)] data-[type=warning]:[--btn-glow:rgba(245,158,11,0.65)]",
  "data-[type=info]:border-sky-500/30! data-[type=info]:text-info-foreground!",
  "data-[type=info]:[--btn-glow-line:rgba(14,165,233,0.95)] data-[type=info]:[--btn-glow:rgba(14,165,233,0.65)]",
  "data-[type=loading]:border-amber-500/30! data-[type=loading]:text-warning-foreground!",
  "data-[type=loading]:[--btn-glow-line:rgba(245,158,11,0.95)] data-[type=loading]:[--btn-glow:rgba(245,158,11,0.65)]",
  "data-[type=success]:animate-toast-success-odd",
  "data-[type=info]:animate-toast-success-odd",
  "data-[type=warning]:animate-toast-success-odd",
  "data-[type=error]:animate-toast-error-odd"
);
