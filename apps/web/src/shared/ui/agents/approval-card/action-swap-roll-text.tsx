"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

import { SPRING_SWAP } from "@/shared/lib/ease";

export function ActionSwapRollText({ value, children }: { value: string; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span className="inline-grid overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? { opacity: 1 } : { y: "70%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className="col-start-1 row-start-1 inline-block"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
