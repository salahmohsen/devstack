"use client";

import { AlertTriangleIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type MouseEventHandler, type ReactNode } from "react";

import {
  BADGE_GLOW,
  BADGE_GLOW_VARS,
  BadgeAnimatedLabel,
  BadgeTopGlow,
  type BadgeGlowVariant
} from "@tsu-stack/ui/components/badge-effects";
import {
  buttonGlowSize,
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
  /** Idle glass tone. Pending / fail / success still use warning / error / success glow. */
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

function glowFor(
  visual: StatusSubmitVisual,
  idleVariant: ButtonProps["variant"]
): BadgeGlowVariant {
  if (visual === "pending" || visual === "warning") return "warning";
  if (visual === "failed") return "error";
  if (visual === "success") return "success";
  if (visual === "unavailable") return "destructive";
  if (idleVariant === "outline" || idleVariant === "ghost") return "outline";
  if (idleVariant === "destructive" || idleVariant === "destructive-outline") return "error";
  if (idleVariant === "secondary") return "secondary";
  if (idleVariant === "brand") return "brand";
  if (idleVariant === "success") return "success";
  if (idleVariant === "warning") return "warning";
  if (idleVariant === "error") return "error";
  if (idleVariant === "info") return "info";
  return "default";
}

function glowText(glow: BadgeGlowVariant) {
  if (glow === "destructive" || glow === "error") return "text-destructive-foreground";
  if (glow === "warning") return "text-warning-foreground";
  if (glow === "success") return "text-success-foreground";
  if (glow === "brand") return "text-brand";
  if (glow === "info") return "text-info-foreground";
  if (glow === "secondary") return "text-secondary-foreground";
  return "text-foreground";
}

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
  const glow = glowFor(visual, idleVariant);
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
        buttonVariants({ size, variant: "glass" }),
        BADGE_GLOW_VARS[glow],
        BADGE_GLOW[glow].border,
        glowText(glow),
        "overflow-visible transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ease-out",
        isPending && "disabled:opacity-100",
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
