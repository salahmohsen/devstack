"use client";

import { type VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";

import { BadgeAnimatedLabel, BadgeTopGlow } from "@tsu-stack/ui/components/badge-effects";
import {
  buttonGlowSize,
  buttonGlowVariant,
  buttonVariants,
  type ButtonProps
} from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { useCopyToClipboard } from "@tsu-stack/ui/hooks/use-copy-to-clipboard";
import { cn } from "@tsu-stack/ui/lib/utils";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export type CopyButtonProps = Omit<
  React.ComponentProps<typeof motion.button>,
  "children" | "value" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  /** Text written to the clipboard. */
  value: string;
  /**
   * Accessible name when icon-only (default).
   * Also used as the visible label prefix when `showLabel` is true.
   */
  label?: string;
  /** When true, show "Copy" / "Copied" next to the morph icon. */
  showLabel?: boolean;
  /** How long the success glow lasts (ms). Default 1600. */
  resetMs?: number;
  onCopied?: (value: string) => void;
  onError?: (error: unknown) => void;
  /** Icon size classes / lucide size prop. Default 16. */
  iconSize?: number;
  size?: ButtonVariantProps["size"];
  variant?: ButtonProps["variant"];
};

const MotionButton = motion.button;

const CHROME_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared copy control: morphs Copy → Check and flashes the success glow
 * variant, then eases back to the idle variant.
 */
export function CopyButton({
  value,
  label = "Copy",
  showLabel = false,
  resetMs = 1600,
  onCopied,
  onError,
  iconSize = 16,
  size = showLabel ? "sm" : "icon",
  variant = "outline",
  className,
  disabled,
  onClick,
  ...buttonProps
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard({ resetMs, onCopied, onError });
  const reduceMotion = Boolean(useReducedMotion());
  const visualVariant = copied ? "success" : variant;
  const glow = buttonGlowVariant(visualVariant);
  const displayLabel = copied ? "Copied" : label;

  return (
    <MotionButton
      type="button"
      disabled={(disabled ?? false) || value.length === 0}
      aria-label={showLabel ? undefined : displayLabel}
      title={showLabel ? undefined : displayLabel}
      data-slot="button"
      data-copied={copied ? "" : undefined}
      layout={showLabel && !reduceMotion}
      transition={{ duration: 0.32, ease: CHROME_EASE }}
      className={cn(
        buttonVariants({ size, variant: visualVariant }),
        "transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ease-out",
        showLabel ? undefined : "shrink-0",
        className
      )}
      {...buttonProps}
      onClick={(event) => {
        void copy(value);
        onClick?.(event);
      }}
    >
      <AnimatePresence mode="sync" initial={false}>
        {glow ? (
          <motion.span
            key={visualVariant}
            aria-hidden
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: CHROME_EASE }}
            className="pointer-events-none absolute inset-0 overflow-visible"
          >
            <BadgeTopGlow variant={glow} size={buttonGlowSize(size)} />
          </motion.span>
        ) : null}
      </AnimatePresence>
      <IconMorph
        active={copied}
        iconA={<Copy size={iconSize} aria-hidden />}
        iconB={<Check size={iconSize} className="text-green-600 dark:text-green-400" aria-hidden />}
      />
      {showLabel ? (
        <span className="flex leading-none">
          <AnimatePresence mode="wait" initial={false}>
            <BadgeAnimatedLabel
              key={displayLabel}
              text={displayLabel}
              id={displayLabel}
              reduceMotion={reduceMotion}
              animateOnMount
            />
          </AnimatePresence>
        </span>
      ) : (
        <span className="sr-only">{displayLabel}</span>
      )}
    </MotionButton>
  );
}
