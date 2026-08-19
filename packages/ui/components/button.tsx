"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { useReducedMotion } from "motion/react";
import * as React from "react";

import {
  BADGE_GLOW,
  BADGE_GLOW_VARS,
  BadgeTopGlow,
  type BadgeGlowVariant
} from "@tsu-stack/ui/components/badge-effects";
import { FlipHoverLayers } from "@tsu-stack/ui/components/flip-hover";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

const ButtonAnimateContext = React.createContext(false);

/** Opt descendants into navbar-style flip hover (`animate` default true). */
export function ButtonAnimateScope({ children }: { children: React.ReactNode }) {
  return <ButtonAnimateContext value>{children}</ButtonAnimateContext>;
}

export function useButtonAnimateDefault(): boolean {
  return React.useContext(ButtonAnimateContext);
}

const glassTone = (glow: BadgeGlowVariant, text: string) =>
  cn(
    "overflow-visible bg-background/90 shadow-xs/5 backdrop-blur-md not-dark:bg-clip-padding",
    "hover:bg-background data-pressed:bg-muted/50",
    "*:data-[slot=button-loading-indicator]:text-foreground",
    BADGE_GLOW[glow].border,
    BADGE_GLOW_VARS[glow],
    "before:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]",
    "after:pointer-events-none after:absolute after:top-0 after:right-[22%] after:left-[22%] after:z-10 after:h-px after:bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]",
    "pointer-coarse:after:inset-0 pointer-coarse:after:right-auto pointer-coarse:after:left-auto pointer-coarse:after:h-auto pointer-coarse:after:bg-transparent",
    text
  );

export const buttonVariants = cva(
  cn(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium whitespace-nowrap transition-shadow outline-none",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)]",
    "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-64 data-loading:text-transparent data-loading:select-none sm:text-sm",
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
        default:
          "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-primary/90 data-pressed:bg-primary/90 *:data-[slot=button-loading-indicator]:text-primary-foreground [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,:active,[data-pressed]]:shadow-none",
        destructive:
          "border-destructive bg-destructive text-white shadow-xs shadow-destructive/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-destructive/90 data-pressed:bg-destructive/90 *:data-[slot=button-loading-indicator]:text-white [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,:active,[data-pressed]]:shadow-none",
        "destructive-outline":
          "border-input bg-popover text-destructive-foreground shadow-xs/5 not-dark:bg-clip-padding not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] hover:border-destructive/32 hover:bg-destructive/4 data-pressed:border-destructive/32 data-pressed:bg-destructive/4 *:data-[slot=button-loading-indicator]:text-foreground dark:bg-input/32 dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/2%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/6%)] [:disabled,:active,[data-pressed]]:shadow-none",
        ghost:
          "border-transparent text-foreground hover:bg-accent data-pressed:bg-accent *:data-[slot=button-loading-indicator]:text-foreground",
        link: "border-transparent text-foreground underline-offset-4 hover:underline data-pressed:underline *:data-[slot=button-loading-indicator]:text-foreground",
        outline:
          "border-input bg-popover text-foreground shadow-xs/5 not-dark:bg-clip-padding not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] hover:bg-accent/50 data-pressed:bg-accent/50 *:data-[slot=button-loading-indicator]:text-foreground dark:bg-input/32 dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/2%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/6%)] hover:dark:bg-input/64 dark:data-pressed:bg-input/64 [:disabled,:active,[data-pressed]]:shadow-none",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 data-pressed:bg-secondary/90 *:data-[slot=button-loading-indicator]:text-secondary-foreground [:active,[data-pressed]]:bg-secondary/80",
        /** Page-level start actions only (Find jobs now, Scan, Detect). */
        glass: glassTone("default", "text-foreground"),
        /**
         * Same paint plane as `default` (solid primary + shared border/shadow) so it
         * joins Add in a Group, plus glass bloom (top glow / hairline) — not frosted /90.
         */
        "glass-primary": cn(
          "overflow-visible border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24",
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)]",
          "hover:bg-primary/90 data-pressed:bg-primary/90",
          "*:data-[slot=button-loading-indicator]:text-primary-foreground",
          BADGE_GLOW_VARS["on-primary"],
          "before:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]",
          "after:pointer-events-none after:absolute after:top-0 after:right-[22%] after:left-[22%] after:z-10 after:h-px after:bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]",
          "pointer-coarse:after:inset-0 pointer-coarse:after:right-auto pointer-coarse:after:left-auto pointer-coarse:after:h-auto pointer-coarse:after:bg-transparent",
          "[:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,:active,[data-pressed]]:shadow-none"
        ),
        /** Glass cancel / stop chrome (AI flow trigger X). Same frost as `glass`, destructive glow. */
        "glass-destructive": cn(
          glassTone("destructive", "text-destructive-foreground"),
          "hover:bg-destructive/8 data-pressed:bg-destructive/12"
        ),
        brand:
          "border-brand/35 bg-background text-brand shadow-xs/5 hover:bg-brand/8 data-pressed:bg-brand/12 *:data-[slot=button-loading-indicator]:text-brand",
        success:
          "border-success/35 bg-background text-success-foreground shadow-xs/5 hover:bg-success/8 data-pressed:bg-success/12 *:data-[slot=button-loading-indicator]:text-success-foreground",
        warning:
          "border-amber-500/35 bg-amber-500/10 text-amber-700 shadow-xs/5 hover:bg-amber-500/15 data-pressed:bg-amber-500/20 *:data-[slot=button-loading-indicator]:text-amber-700 dark:text-amber-400 dark:*:data-[slot=button-loading-indicator]:text-amber-400",
        error:
          "border-input bg-popover text-destructive-foreground shadow-xs/5 not-dark:bg-clip-padding hover:border-destructive/32 hover:bg-destructive/4 data-pressed:bg-destructive/4 *:data-[slot=button-loading-indicator]:text-foreground dark:bg-input/32",
        info: "border-sky-500/35 bg-sky-500/8 text-sky-700 shadow-xs/5 hover:bg-sky-500/12 data-pressed:bg-sky-500/16 *:data-[slot=button-loading-indicator]:text-sky-700 dark:text-sky-400 dark:*:data-[slot=button-loading-indicator]:text-sky-400"
      }
    }
  }
);

export type ButtonProps = {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  loading?: boolean;
  /**
   * Navbar flip on hover/focus-visible. Defaults true inside `ButtonAnimateScope`.
   * Ignored while `loading` — coss overlay spinner stays the loading chrome.
   */
  animate?: boolean;
} & useRender.ComponentProps<"button">;

export function buttonGlowVariant(variant: ButtonProps["variant"]): BadgeGlowVariant | null {
  if (variant === "glass") return "default";
  if (variant === "glass-primary") return "on-primary";
  if (variant === "glass-destructive") return "destructive";
  return null;
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
  animate,
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
  const animateDefault = useButtonAnimateDefault();
  const flipHover = (animate ?? animateDefault) && !loading && !reduceMotion;
  const isDisabled: boolean = Boolean(loading || disabledProp);
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] = render
    ? undefined
    : "button";
  const glow = buttonGlowVariant(variant);

  const defaultProps = {
    children: (
      <>
        {glow ? <BadgeTopGlow variant={glow} size={buttonGlowSize(size)} /> : null}
        {flipHover ? <FlipHoverLayers hovered={hovered}>{children}</FlipHoverLayers> : children}
        {loading ? (
          <Spinner className="pointer-events-none absolute" data-slot="button-loading-indicator" />
        ) : null}
      </>
    ),
    // Glass blooms sit above the shell — never clip them with flip-hover overflow.
    className: cn(
      buttonVariants({ size, variant }),
      className,
      flipHover && !glow && "overflow-hidden"
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
    onMouseLeave: () => setHovered(false),
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
      if (event.currentTarget.matches(":focus-visible")) setHovered(true);
    },
    onBlur: () => setHovered(false)
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render
  });
}
