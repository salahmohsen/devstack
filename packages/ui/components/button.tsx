"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { useReducedMotion } from "motion/react";
import * as React from "react";

import {
  BADGE_GLOW,
  BadgeAnimatedLabel,
  BadgeTopGlow,
  type BadgeGlowVariant
} from "@tsu-stack/ui/components/badge-effects";
import { StatusStateIcon } from "@tsu-stack/ui/components/status-badge";
import { cn } from "@tsu-stack/ui/lib/utils";

const GLOW_VARS: Record<BadgeGlowVariant, string> = {
  default:
    "[--btn-glow:rgba(24,24,27,0.4)] [--btn-glow-line:rgba(24,24,27,0.55)] dark:[--btn-glow:rgba(250,250,250,0.45)] dark:[--btn-glow-line:rgba(250,250,250,0.7)]",
  brand: "[--btn-glow:rgba(99,102,241,0.7)] [--btn-glow-line:rgba(99,102,241,0.95)]",
  destructive: "[--btn-glow:rgba(239,68,68,0.7)] [--btn-glow-line:rgba(239,68,68,0.95)]",
  error: "[--btn-glow:rgba(239,68,68,0.65)] [--btn-glow-line:rgba(239,68,68,0.95)]",
  info: "[--btn-glow:rgba(14,165,233,0.65)] [--btn-glow-line:rgba(14,165,233,0.95)]",
  outline: "[--btn-glow:rgba(113,113,122,0.4)] [--btn-glow-line:rgba(113,113,122,0.55)]",
  secondary: "[--btn-glow:rgba(113,113,122,0.45)] [--btn-glow-line:rgba(113,113,122,0.6)]",
  success: "[--btn-glow:rgba(34,197,94,0.65)] [--btn-glow-line:rgba(34,197,94,0.95)]",
  warning: "[--btn-glow:rgba(245,158,11,0.65)] [--btn-glow-line:rgba(245,158,11,0.95)]"
};

const glassTone = (glow: BadgeGlowVariant, text: string) =>
  cn(
    "bg-background/90 shadow-xs/5 backdrop-blur-md not-dark:bg-clip-padding",
    "hover:bg-background data-pressed:bg-muted/50",
    "*:data-[slot=button-loading-indicator]:text-foreground",
    BADGE_GLOW[glow].border,
    GLOW_VARS[glow],
    text
  );

export const buttonVariants = cva(
  cn(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-visible rounded-lg border text-base font-medium whitespace-nowrap transition-shadow outline-none",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)]",
    "before:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]",
    "after:pointer-events-none after:absolute after:top-0 after:right-[22%] after:left-[22%] after:h-px after:bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-64 data-loading:text-transparent data-loading:select-none sm:text-sm",
    "pointer-coarse:after:inset-0 pointer-coarse:after:right-auto pointer-coarse:after:left-auto pointer-coarse:after:h-auto pointer-coarse:after:bg-transparent",
    "pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
    "[&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4"
  ),
  {
    defaultVariants: {
      size: "default",
      variant: "default"
    },
    variants: {
      size: {
        default: "h-9 px-[calc(--spacing(3)-1px)] sm:h-8",
        icon: "size-9 sm:size-8",
        "icon-lg": "size-10 sm:size-9",
        "icon-sm": "size-8 sm:size-7",
        "icon-xl":
          "size-11 sm:size-10 [&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4.5",
        "icon-xs":
          "size-7 rounded-md before:rounded-[calc(var(--radius-md)-1px)] sm:size-6 not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-4 sm:not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 px-[calc(--spacing(3.5)-1px)] sm:h-9",
        sm: "h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] sm:h-7",
        xl: "h-11 px-[calc(--spacing(4)-1px)] text-lg sm:h-10 sm:text-base [&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4.5",
        xs: "h-7 gap-1 rounded-md px-[calc(--spacing(2)-1px)] text-sm before:rounded-[calc(var(--radius-md)-1px)] sm:h-6 sm:text-xs [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5"
      },
      variant: {
        default: glassTone("default", "text-foreground"),
        destructive: glassTone("destructive", "text-destructive-foreground"),
        "destructive-outline": glassTone("error", "text-destructive-foreground"),
        ghost: cn(
          GLOW_VARS.outline,
          "border-transparent text-foreground hover:bg-accent data-pressed:bg-accent *:data-[slot=button-loading-indicator]:text-foreground"
        ),
        link: cn(
          "[--btn-glow-line:transparent] [--btn-glow:transparent]",
          "border-transparent text-foreground underline-offset-4 hover:underline data-pressed:underline *:data-[slot=button-loading-indicator]:text-foreground"
        ),
        outline: glassTone("outline", "text-foreground"),
        secondary: glassTone("secondary", "text-secondary-foreground"),
        brand: glassTone("brand", "text-brand"),
        success: glassTone("success", "text-success-foreground"),
        warning: glassTone("warning", "text-warning-foreground"),
        error: glassTone("error", "text-destructive-foreground"),
        info: glassTone("info", "text-info-foreground")
      }
    }
  }
);

export type ButtonProps = {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  loading?: boolean;
} & useRender.ComponentProps<"button">;

function collectButtonLabel(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectButtonLabel).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return collectButtonLabel(node.props.children);
  }
  return "";
}

export function buttonGlowVariant(variant: ButtonProps["variant"]): BadgeGlowVariant | null {
  switch (variant) {
    case "link":
      return null;
    case "destructive":
      return "destructive";
    case "destructive-outline":
    case "error":
      return "error";
    case "ghost":
    case "outline":
      return "outline";
    case "secondary":
      return "secondary";
    case "brand":
      return "brand";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "default":
    case undefined:
    case null:
      return "default";
  }
}

export function buttonGlowSize(size: ButtonProps["size"]): "sm" | "default" | "lg" {
  switch (size) {
    case "xs":
    case "sm":
    case "icon-xs":
    case "icon-sm":
      return "sm";
    case "lg":
    case "xl":
    case "icon-lg":
    case "icon-xl":
      return "lg";
    case "default":
    case "icon":
    case undefined:
    case null:
      return "default";
  }
}

export function Button({
  className,
  variant,
  size,
  render,
  children,
  loading = false,
  disabled: disabledProp,
  ...props
}: ButtonProps): React.ReactElement {
  /**
   * Track hover on the full host element so icon-motion can animate when the
   * pointer is anywhere on the button (label/padding), not only the icon.
   * Exposed as data-hovered for plain CSS descendants.
   */
  const [hovered, setHovered] = React.useState(false);
  const reduceMotion = Boolean(useReducedMotion());
  const isDisabled: boolean = Boolean(loading || disabledProp);
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] = render
    ? undefined
    : "button";
  const visualVariant = loading ? "warning" : variant;
  const glow = buttonGlowVariant(visualVariant);
  const loadingLabel = loading ? collectButtonLabel(children).trim() : "";

  const defaultProps = {
    children: (
      <>
        {glow ? <BadgeTopGlow variant={glow} size={buttonGlowSize(size)} /> : null}
        {loading ? (
          <>
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <StatusStateIcon state="pending" reduceMotion={reduceMotion} />
            </span>
            {loadingLabel ? (
              <span className="flex leading-none">
                <BadgeAnimatedLabel
                  key={loadingLabel}
                  text={loadingLabel}
                  id={loadingLabel}
                  reduceMotion={reduceMotion}
                  animateOnMount
                />
              </span>
            ) : null}
          </>
        ) : (
          children
        )}
      </>
    ),
    className: cn(
      buttonVariants({ className, size, variant: visualVariant }),
      loading && "data-loading:text-current data-loading:select-auto"
    ),
    "aria-disabled": loading || undefined,
    "data-loading": loading ? "" : undefined,
    "data-hovered": hovered ? "" : undefined,
    "data-slot": "button",
    "data-cuelume-press": "",
    "data-cuelume-release": "",
    disabled: isDisabled,
    type: typeValue,
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false)
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render
  });
}
