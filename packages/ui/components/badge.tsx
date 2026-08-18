"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";

import { BADGE_GLOW, BadgeLabel, BadgeTopGlow } from "@tsu-stack/ui/components/badge-effects";
import { cn } from "@tsu-stack/ui/lib/utils";

export const badgeVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-xs border bg-background/90 font-mono font-medium tracking-wide whitespace-nowrap uppercase backdrop-blur-md transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3 [button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",
  {
    defaultVariants: {
      size: "default",
      variant: "default"
    },
    variants: {
      size: {
        default: "h-6 min-w-6 px-2.5 text-xs sm:h-5.5 sm:min-w-5.5 sm:px-2",
        lg: "h-7 min-w-7 px-3 text-sm sm:h-6.5 sm:min-w-6.5 sm:px-2.5 sm:text-xs",
        sm: "h-5.5 min-w-5.5 px-2 text-xs leading-none sm:h-5 sm:min-w-5 sm:px-1.5 sm:text-[.6875rem]",
        xs: "h-5 min-w-5 gap-1 px-1.5 text-[0.625rem] leading-none sm:h-4.5 sm:min-w-4.5 sm:px-1 [&_svg:not([class*='size-'])]:size-3"
      },
      variant: {
        default: cn("text-foreground", BADGE_GLOW.default.border),
        brand: cn("text-brand", BADGE_GLOW.brand.border),
        destructive: cn(
          "bg-red-50/90 text-red-700 dark:bg-background/90 dark:text-red-300",
          BADGE_GLOW.destructive.border
        ),
        error: cn(
          "bg-red-50/80 text-destructive-foreground dark:bg-background/90",
          BADGE_GLOW.error.border
        ),
        info: cn("bg-sky-50/80 text-info-foreground dark:bg-background/90", BADGE_GLOW.info.border),
        outline: cn("text-foreground", BADGE_GLOW.outline.border),
        secondary: cn("text-secondary-foreground", BADGE_GLOW.secondary.border),
        success: cn(
          "bg-emerald-50/80 text-success-foreground dark:bg-background/90",
          BADGE_GLOW.success.border
        ),
        warning: cn(
          "bg-amber-50/80 text-warning-foreground dark:bg-background/90",
          BADGE_GLOW.warning.border
        )
      }
    }
  }
);

export type BadgeProps = {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  size?: VariantProps<typeof badgeVariants>["size"];
  /** Stagger letters on first paint (status chips). Default: only when text changes. */
  animateLabel?: boolean;
  /** Optional leading icon; sits before the animated label. */
  icon?: React.ReactNode;
} & useRender.ComponentProps<"span">;

function badgeChildren(children: React.ReactNode, animateLabel: boolean): React.ReactNode {
  if (typeof children === "string" || typeof children === "number") {
    return <BadgeLabel text={String(children)} animateOnMount={animateLabel} />;
  }
  return children;
}

export function Badge({
  className,
  variant = "default",
  size = "default",
  animateLabel = false,
  icon,
  render,
  children,
  ...props
}: BadgeProps): React.ReactElement {
  const defaultProps = {
    className: cn(badgeVariants({ className, size, variant })),
    "data-slot": "badge",
    "data-variant": variant,
    children: (
      <>
        <BadgeTopGlow variant={variant ?? "default"} size={size ?? "default"} />
        {icon ? (
          <span className="relative flex size-3.5 shrink-0 items-center justify-center">
            {icon}
          </span>
        ) : null}
        {badgeChildren(children, animateLabel)}
      </>
    )
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render
  });
}
