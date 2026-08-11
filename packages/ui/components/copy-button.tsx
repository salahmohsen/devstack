"use client";

import { type VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import * as React from "react";

import { Button, type buttonVariants } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { useCopyToClipboard } from "@tsu-stack/ui/hooks/use-copy-to-clipboard";
import { cn } from "@tsu-stack/ui/lib/utils";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export type CopyButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "children" | "value"
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
  /** How long the check state lasts (ms). Default 1500. */
  resetMs?: number;
  onCopied?: (value: string) => void;
  onError?: (error: unknown) => void;
  /** Icon size classes / lucide size prop. Default 16. */
  iconSize?: number;
  size?: ButtonVariantProps["size"];
  variant?: ButtonVariantProps["variant"];
};

/**
 * Shared copy control: IconMorph between Copy and Check.
 * Prefer this over ad-hoc clipboard handlers so animation and a11y stay consistent.
 */
export function CopyButton({
  value,
  label = "Copy",
  showLabel = false,
  resetMs = 1500,
  onCopied,
  onError,
  iconSize = 16,
  size = showLabel ? "sm" : "icon",
  variant = "outline",
  className,
  disabled,
  ...buttonProps
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard({ resetMs, onCopied, onError });

  const ariaLabel = copied ? "Copied" : label;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={(disabled ?? false) || value.length === 0}
      className={cn(showLabel ? undefined : "shrink-0", className)}
      aria-label={showLabel ? undefined : ariaLabel}
      title={showLabel ? undefined : ariaLabel}
      onClick={() => {
        void copy(value);
      }}
      {...buttonProps}
    >
      <IconMorph
        active={copied}
        iconA={<Copy size={iconSize} aria-hidden />}
        iconB={<Check size={iconSize} className="text-success" aria-hidden />}
      />
      {showLabel ? <span>{copied ? "Copied" : label}</span> : null}
      {showLabel ? null : <span className="sr-only">{ariaLabel}</span>}
    </Button>
  );
}
