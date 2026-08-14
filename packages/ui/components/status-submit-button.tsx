"use client";

import { AlertTriangleIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type MouseEventHandler, type ReactNode } from "react";

import {
  BADGE_GLOW,
  BadgeAnimatedLabel,
  BadgeTopGlow
} from "@tsu-stack/ui/components/badge-effects";
import {
  buttonGlowSize,
  buttonGlowVariant,
  buttonVariants,
  useButtonAnimateDefault,
  type ButtonProps
} from "@tsu-stack/ui/components/button";
import { FlipHoverLayers } from "@tsu-stack/ui/components/flip-hover";
import {
  ICON_VARIANTS,
  StatusStateIcon,
  type StatusState
} from "@tsu-stack/ui/components/status-badge";
import { cn } from "@tsu-stack/ui/lib/utils";

export type StatusSubmitVisual = StatusState | "idle" | "unavailable";

export type StatusSubmitButtonProps = {
  state?: StatusSubmitVisual;
  label: string;
  disabled?: boolean;
  type?: "button" | "submit";
  size?: "sm" | "default";
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Shown in the idle state (status states use the built-in status icon). */
  icon?: ReactNode;
  /** Button chrome while idle. Status states still map to warning/error/success. */
  idleVariant?: ButtonProps["variant"];
  /** Convenience alias: when true, visual state is `pending`. */
  loading?: boolean;
  /** Navbar flip while idle. Defaults true inside `ButtonAnimateScope`. */
  animate?: boolean;
} & Omit<
  ComponentProps<typeof motion.button>,
  "children" | "onClick" | "type" | "disabled" | "onDrag" | "onDragStart" | "onDragEnd"
>;

const MotionButton = motion.button;

const STATE_VARIANT = {
  idle: "default",
  pending: "warning",
  warning: "warning",
  failed: "error",
  success: "success",
  unavailable: "destructive"
} as const;

function StatusSubmitButton({
  state = "idle",
  label,
  disabled = false,
  type = "button",
  size = "default",
  className,
  onClick,
  icon,
  idleVariant = "default",
  loading = false,
  animate,
  ...props
}: StatusSubmitButtonProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const animateDefault = useButtonAnimateDefault();
  const visual: StatusSubmitVisual = loading ? "pending" : state;
  const variant = visual === "idle" ? idleVariant : STATE_VARIANT[visual];
  const glow = buttonGlowVariant(variant);
  const isPending = visual === "pending";
  const isDisabled = disabled === true || isPending;
  const flipHover = (animate ?? animateDefault) && visual === "idle" && !reduceMotion;

  const body = (
    <>
      {visual !== "idle" || icon ? (
        <span className="relative flex size-3.5 shrink-0 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={visual === "idle" ? "idle-icon" : visual}
              variants={reduceMotion ? undefined : ICON_VARIANTS}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              exit={reduceMotion ? undefined : "exit"}
              className="absolute flex items-center"
            >
              {visual === "idle" ? (
                icon
              ) : visual === "unavailable" ? (
                <AlertTriangleIcon
                  size={14}
                  strokeWidth={2}
                  className={BADGE_GLOW.destructive.icon}
                />
              ) : (
                <StatusStateIcon state={visual} reduceMotion={reduceMotion} />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
      <span className="flex leading-none">
        <AnimatePresence mode="wait">
          <BadgeAnimatedLabel
            key={`${visual}-${label}`}
            text={label}
            id={`${visual}-${label}`}
            reduceMotion={reduceMotion}
            animateOnMount
          />
        </AnimatePresence>
      </span>
    </>
  );

  return (
    <MotionButton
      type={type}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={isPending || undefined}
      data-slot="button"
      data-cuelume-press=""
      data-cuelume-release=""
      onClick={onClick}
      layout={!reduceMotion}
      initial="initial"
      whileHover={flipHover ? "hover" : undefined}
      whileFocus={flipHover ? "hover" : undefined}
      className={cn(
        buttonVariants({ size, variant }),
        "transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ease-out",
        // buttonVariants hides label at data-loading (spinner overlay). This
        // control shows the pending icon + label instead.
        "data-loading:text-current data-loading:select-auto",
        flipHover && "overflow-hidden",
        className
      )}
      {...props}
    >
      {glow ? <BadgeTopGlow variant={glow} size={buttonGlowSize(size)} /> : null}
      {flipHover ? <FlipHoverLayers>{body}</FlipHoverLayers> : body}
    </MotionButton>
  );
}

export { StatusSubmitButton };
