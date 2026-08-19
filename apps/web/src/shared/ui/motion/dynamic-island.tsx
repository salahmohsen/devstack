"use client";
// beui.dev/components/blocks/dynamic-island — origin flipped for bottom-left host

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { EASE_OUT } from "@/shared/lib/ease";

type IslandContextValue = {
  view: string | null;
};

const IslandContext = createContext<IslandContextValue | null>(null);

// Snappier than stock beUI 0.8s — same spring morph language, Live Activity pace.
// Shell animates real width/height (not transforms), so slots stay undistorted.
const SHELL_SPRING = {
  type: "spring",
  duration: 0.48,
  bounce: 0.18
} as const;

// Content travels with the shell; slightly livelier, still brief (better-ui restraint).
const CONTENT_SPRING = {
  type: "spring",
  duration: 0.42,
  bounce: 0.22
} as const;

// Constant radius — never animated. The browser clamps it to half the shell
// height, so the pill-to-rounded-rect morph falls out of the resize for free
// with zero chance of corner glitches.
const RADIUS = 32;

// iPhone pill dimensions. Also the shell's pre-measure animate target: if the
// first commit already has a view active (e.g. a click replayed after
// hydration), the shell blooms from the pill instead of rendering expanded
// with no animation. Lives in `animate`, not `initial`, so server and client
// markup agree.
const PILL_WIDTH = 126;
const PILL_HEIGHT = 37;

/** Tracks the natural size of the content so the shell can spring to it. */
function useContentSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Synchronous mount measure: the shell must own explicit dimensions before
  // the first interaction. ResizeObserver fires async after mount — a quick
  // first press could beat it, leaving the shell auto-sized so the view
  // snapped open instead of springing.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function Slot({
  keyId,
  children,
  className
}: {
  keyId: string;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={keyId}
      initial={
        reduce
          ? { opacity: 0, filter: "blur(0px)" }
          : { opacity: 0, scale: 0.9, y: 8, filter: "blur(5px)" }
      }
      animate={
        reduce
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
      }
      // Exit gets sucked down into the pill — fast, blur-free, before the
      // shrinking shell can clip it.
      exit={
        reduce
          ? { opacity: 0, filter: "blur(0px)", transition: { duration: 0.1 } }
          : {
              opacity: 0,
              scale: 0.9,
              y: 6,
              filter: "blur(0px)",
              transition: { duration: 0.08, ease: EASE_OUT }
            }
      }
      // One spring drives transform, opacity and blur together — no per
      // property tweens, no delays. Content travels with the shell.
      transition={reduce ? { duration: 0.15 } : CONTENT_SPRING}
      // Anchored to the pill line: content rises out of it and is sucked
      // back down into it (bottom-left host).
      style={{ transformOrigin: "bottom center" }}
      className={cn("flex items-center justify-center", className)}
    >
      {children}
    </motion.div>
  );
}

export type DynamicIslandAppearance = "inverted" | "glass";

export type DynamicIslandProps = {
  /** Active view id. `null` shows the compact pill. */
  view: string | null;
  /** Compact pill content, shown when no view is active. */
  compact?: ReactNode;
  /** DynamicIslandView elements. */
  children?: ReactNode;
  /**
   * `inverted` — solid `bg-foreground` (no frost).
   * `glass` — frosted inverted fill: black in light mode, white in dark mode.
   */
  appearance?: DynamicIslandAppearance;
  /** Accessible name when expanded (`role="region"`). Compact stays a live status. */
  label?: string;
  className?: string;
};

/**
 * Inverted glass: frosted `foreground` fill — black in light mode, white in dark —
 * with AI-trigger-style bloom (glow polarity flipped for the inverted substrate).
 * Outer shell stays `overflow-visible` so the top bloom is not clipped.
 */
const GLASS_SHELL_CLASS = cn(
  "overflow-visible bg-foreground/90 text-background shadow-lg",
  "border border-white/20 dark:border-black/15",
  "backdrop-blur-md backdrop-saturate-150 not-dark:bg-clip-padding",
  // Light bloom on black glass (light mode); dark bloom on white glass (dark mode).
  "[--btn-glow-line:rgba(250,250,250,0.75)] [--btn-glow:rgba(250,250,250,0.45)]",
  "dark:[--btn-glow-line:rgba(24,24,27,0.4)] dark:[--btn-glow:rgba(24,24,27,0.28)]",
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
  "before:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--btn-glow)_0%,transparent_72%)]",
  "after:pointer-events-none after:absolute after:top-0 after:right-[22%] after:left-[22%] after:z-10 after:h-px",
  "after:bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
);

const INVERTED_SHELL_CLASS =
  "overflow-hidden border border-transparent bg-foreground text-background shadow-2xl";

/** Top bloom for inverted glass (BadgeTopGlow polarity is page-themed, not substrate-themed). */
function InvertedGlassGlow() {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-2 right-[10%] left-[10%] h-4 opacity-55 blur-[7px]",
          "bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(250,250,250,0.55)_0%,transparent_70%)]",
          "dark:bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgba(24,24,27,0.45)_0%,transparent_70%)]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-1 right-[22%] left-[22%] h-2 opacity-75 blur-[3.5px]",
          "bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(250,250,250,0.4)_0%,transparent_70%)]",
          "dark:bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(24,24,27,0.35)_0%,transparent_70%)]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 right-[28%] left-[28%] h-px opacity-70 dark:opacity-50",
          "bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,var(--btn-glow-line)_0%,transparent_100%)]"
        )}
      />
    </>
  );
}

export function DynamicIsland({
  view,
  compact,
  children,
  appearance = "inverted",
  label = "AI job",
  className
}: DynamicIslandProps) {
  const reduce = useReducedMotion();
  const expanded = view !== null;
  const [sizerRef, size] = useContentSize();
  const contextValue = useMemo(() => {
    return { view };
  }, [view]);
  const glass = appearance === "glass";

  return (
    <IslandContext.Provider value={contextValue}>
      <motion.div
        // Compact = polite live status. Expanded hosts Cancel/actions — never
        // nest interactive controls inside a live region (a11y).
        role={expanded ? "region" : "status"}
        aria-live={expanded ? undefined : "polite"}
        aria-label={expanded ? label : undefined}
        data-appearance={appearance}
        data-expanded={expanded ? "" : undefined}
        initial={false}
        animate={
          size
            ? { width: size.width, height: size.height }
            : { width: PILL_WIDTH, height: PILL_HEIGHT }
        }
        transition={reduce ? { duration: 0 } : SHELL_SPRING}
        style={{ borderRadius: RADIUS }}
        // items-end pins content to the bottom edge while the shell springs, so
        // expansion reads as rising upward out of the pill. Bottom-align the
        // island in its parent (bottom-left host) to complete the effect.
        className={cn(
          "relative inline-flex items-end justify-center",
          glass ? GLASS_SHELL_CLASS : INVERTED_SHELL_CLASS,
          className
        )}
      >
        {glass ? <InvertedGlassGlow /> : null}
        {/* Clip morphing content without clipping the glass bloom above the shell. */}
        <div className="relative z-10 overflow-hidden rounded-[inherit]">
          <div ref={sizerRef} className="w-max">
            <AnimatePresence mode="popLayout" initial={false}>
              {!expanded && compact ? (
                <Slot
                  keyId="compact"
                  // Extra inline padding so text clears the 32px pill curve (better-ui radius).
                  className="gap-2.5 px-5 py-2.5 text-xs font-medium"
                >
                  {compact}
                </Slot>
              ) : null}
            </AnimatePresence>
            {children}
          </div>
        </div>
      </motion.div>
    </IslandContext.Provider>
  );
}

export type DynamicIslandViewProps = {
  /** Matches the parent `view` prop when active. */
  id: string;
  children: ReactNode;
  className?: string;
};

export function DynamicIslandView({ id, children, className }: DynamicIslandViewProps) {
  const ctx = useContext(IslandContext);
  if (!ctx) throw new Error("DynamicIslandView must be used inside <DynamicIsland>");
  const active = ctx.view === id;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {active ? (
        <Slot keyId={id} className={cn("px-5 py-4", className)}>
          {children}
        </Slot>
      ) : null}
    </AnimatePresence>
  );
}
