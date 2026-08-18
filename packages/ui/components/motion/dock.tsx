"use client";

import { motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useId, useMemo, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/** Shared-layout spring for the active dock pill. */
const SPRING_LAYOUT = {
  type: "spring" as const,
  stiffness: 360,
  damping: 32,
  mass: 0.6
};

type DockContextValue = {
  size: number;
  pillLayoutId: string;
};

const DockContext = createContext<DockContextValue | null>(null);

export type DockProps = {
  children: ReactNode;
  className?: string;
  /** Size of each item in px. */
  size?: number;
};

export function Dock({ children, size = 44, className }: DockProps) {
  const pillLayoutId = useId();
  const ctx = useMemo<DockContextValue>(() => {
    return { size, pillLayoutId };
  }, [size, pillLayoutId]);

  return (
    <DockContext.Provider value={ctx}>
      <div
        className={cn(
          "inline-flex h-auto items-end gap-1.5 rounded-2xl border border-border bg-card/80 px-2 py-1 shadow-2xl backdrop-blur-xl",
          className
        )}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

export type DockItemProps = {
  children: ReactNode;
  className?: string;
  /** When set, the item renders as a button. Omit when children carry their own link. */
  onClick?: () => void;
  active?: boolean;
  "aria-label"?: string;
};

export function DockItem({ children, className, onClick, active, ...rest }: DockItemProps) {
  const dock = useContext(DockContext);
  const reduce = useReducedMotion();
  const size = dock?.size ?? 44;
  const pillLayoutId = dock?.pillLayoutId ?? "dock-pill";

  const pill = active ? (
    <motion.span
      layoutId={pillLayoutId}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className="absolute inset-0.5 -z-10 rounded-xl bg-primary/10"
    />
  ) : null;

  const sharedStyle = { width: size, height: size };
  const sharedClass = cn(
    "relative flex shrink-0 items-center justify-center rounded-full text-foreground",
    "transition-transform active:scale-[0.96]",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={rest["aria-label"]}
        aria-pressed={active}
        style={sharedStyle}
        className={cn(
          sharedClass,
          "cursor-pointer border-0 bg-transparent p-0 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        {pill}
        {children}
      </button>
    );
  }

  return (
    <div style={sharedStyle} className={sharedClass}>
      {pill}
      {children}
    </div>
  );
}

export function DockSeparator({ className }: { className?: string }) {
  return <span aria-hidden className={cn("mx-1 h-6 w-px self-center bg-border", className)} />;
}
