"use client";

import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, type Easing, type Transition } from "motion/react";
import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

const SPRING_CONFIG_TEXT = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 1.3
} as Transition;

const EASE_CUBIC_CONFIG = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1] as Easing
} as Transition;

const MotionLink = motion.create(Link);

const itemClassName =
  "relative block overflow-hidden rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
          <MorphNavLayers>{children}</MorphNavLayers>
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
        <MorphNavLayers>{children}</MorphNavLayers>
      </MotionLink>
    </li>
  );
}

function MorphNavLayers({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="relative inline-flex items-center justify-center gap-1.5 text-transparent">
        {children}
      </span>
      <motion.span
        className="absolute inset-0 z-2 flex items-center justify-center gap-1.5"
        initial={{ y: 0, scale: 1, rotate: 0 }}
        variants={{ hover: { y: -100, scale: 0.5, rotate: -30 } }}
        transition={SPRING_CONFIG_TEXT}
      >
        {children}
      </motion.span>
      <motion.span
        className="absolute inset-0 z-1 w-full scale-x-150 overflow-hidden bg-brand"
        initial={{ y: 100, rotate: -40 }}
        variants={{ hover: { y: 0, rotate: 0 } }}
        transition={EASE_CUBIC_CONFIG}
      >
        <motion.span
          className="absolute inset-0 bg-foreground"
          initial={{ y: 150, rotate: -60 }}
          variants={{ hover: { y: 0, rotate: 0 } }}
          transition={EASE_CUBIC_CONFIG}
        />
      </motion.span>
      <motion.span
        className="absolute inset-0 z-2 flex items-center justify-center gap-1.5 text-background"
        initial={{ y: 180, rotate: -60, scale: 0.5 }}
        variants={{ hover: { y: 0, rotate: 0, scale: 1 } }}
        transition={SPRING_CONFIG_TEXT}
      >
        {children}
      </motion.span>
    </>
  );
}
