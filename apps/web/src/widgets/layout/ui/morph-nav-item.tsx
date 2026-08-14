"use client";

import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

import { FlipHoverLayers } from "@tsu-stack/ui/components/flip-hover";
import { cn } from "@tsu-stack/ui/lib/utils";

const MotionLink = motion.create(Link);

const itemClassName =
  "relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type MorphNavItemBase = {
  active?: boolean;
  label: string;
  children: ReactNode;
  className?: string;
};

type MorphNavItemProps = MorphNavItemBase &
  (
    | { href: string; to?: never; params?: never }
    | { to: string; params?: Record<string, string>; href?: never }
  );

export function MorphNavItem({
  active = false,
  label,
  children,
  className,
  ...target
}: MorphNavItemProps) {
  const reduceMotion = useReducedMotion() === true;
  const sharedClassName = cn(itemClassName, className);
  const ariaCurrent = active ? ("page" as const) : undefined;

  if (reduceMotion) {
    const staticClassName = cn(
      sharedClassName,
      "transition-colors hover:bg-brand hover:text-zinc-950",
      active && "bg-brand text-zinc-950"
    );
    if ("href" in target) {
      return (
        <li>
          <a
            href={target.href}
            aria-label={label}
            aria-current={ariaCurrent}
            className={staticClassName}
          >
            {children}
          </a>
        </li>
      );
    }
    return (
      <li>
        <Link
          to={target.to as never}
          params={target.params as never}
          aria-label={label}
          aria-current={ariaCurrent}
          className={staticClassName}
        >
          {children}
        </Link>
      </li>
    );
  }

  const motionProps = {
    initial: "initial" as const,
    whileHover: "hover" as const,
    whileFocus: "hover" as const,
    animate: active ? ("hover" as const) : ("initial" as const),
    variants: { initial: {}, hover: {} }
  };

  if ("href" in target) {
    return (
      <li>
        <motion.a
          href={target.href}
          aria-label={label}
          aria-current={ariaCurrent}
          className={sharedClassName}
          {...motionProps}
        >
          <FlipHoverLayers>{children}</FlipHoverLayers>
        </motion.a>
      </li>
    );
  }

  return (
    <li>
      <MotionLink
        to={target.to as never}
        params={target.params as never}
        aria-label={label}
        aria-current={ariaCurrent}
        className={sharedClassName}
        {...motionProps}
      >
        <FlipHoverLayers>{children}</FlipHoverLayers>
      </MotionLink>
    </li>
  );
}
