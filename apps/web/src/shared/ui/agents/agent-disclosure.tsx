"use client";

import { motion, type HTMLMotionProps, useReducedMotion } from "motion/react";
import { type CSSProperties } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { EASE_OUT } from "@/shared/lib/ease";

export type AgentDisclosureProps = {
  open: boolean;
  openHeight?: CSSProperties["height"];
} & Omit<HTMLMotionProps<"div">, "animate" | "initial">;

export function AgentDisclosure({
  open,
  openHeight = "auto",
  className,
  style,
  transition,
  ...props
}: AgentDisclosureProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      {...props}
      aria-hidden={!open}
      inert={!open}
      initial={false}
      animate={
        reduce
          ? { opacity: open ? 1 : 0 }
          : {
              opacity: open ? 1 : 0,
              clipPath: open ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
              y: open ? 0 : -4
            }
      }
      transition={
        transition ?? {
          duration: reduce ? 0 : open ? 0.22 : 0.14,
          ease: EASE_OUT
        }
      }
      className={cn("overflow-hidden", className)}
      style={{
        ...style,
        height: open ? openHeight : 0,
        pointerEvents: open ? undefined : "none",
        transformOrigin: "top"
      }}
    />
  );
}
