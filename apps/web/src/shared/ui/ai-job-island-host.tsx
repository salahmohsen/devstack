"use client";

import { useNavigate } from "@tanstack/react-router";
import { BorderBeam } from "border-beam";
import { CheckIcon, XIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type CSSProperties,
  type ReactNode
} from "react";

import { BadgeTopGlow } from "@tsu-stack/ui/components/badge-effects";
import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  defaultForegroundId,
  dismissAiJobIsland,
  focusIslandRun,
  getForegroundRun,
  islandRunRecency,
  setAiIslandAutoDismissHandler,
  useAiJobIsland,
  type AiIslandRun,
  type AiIslandStep
} from "@/shared/lib/ai-job";
import { useHoverCapable } from "@/shared/lib/use-hover-capable";
import { WorkflowSolvingOrb } from "@/shared/ui/ai-flow-trigger";
import { AiLoader } from "@/shared/ui/ai-loader";
import {
  DYNAMIC_ISLAND_RADIUS,
  DynamicIsland,
  DynamicIslandView,
  GLASS_ISLAND_SHELL_CLASS
} from "@/shared/ui/motion/dynamic-island";

type IslandView = null | "timeline" | "result";

function stripTrailingDots(text: string) {
  return text.replace(/(?:\.{2,}|…)+$/u, "").trimEnd();
}

/** Controls on primary glass (same plane as Organize / glass-primary). */
const onPrimaryOutline =
  "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 data-pressed:bg-primary-foreground/25";
const onPrimaryGhost =
  "border-transparent text-primary-foreground hover:bg-primary-foreground/15 data-pressed:bg-primary-foreground/15";
/** Focus ring that reads on primary glass (page `ring` is invisible on dark primary). */
const onPrimaryFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/55 focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

/**
 * Sonner v2 stack (verified against the published runtime): collapsed back
 * cards shrink per depth — scale 1 - depth*0.05, no flip — content hidden,
 * stepping one gap up per level above the front pill. Hover/focus spreads
 * the fan out — full scale, full height + gap per level.
 * `--island-index` = depth behind the front (1 = directly behind).
 */
const ISLAND_STACK_ITEM_CLASS = cn(
  "absolute bottom-0 left-0",
  "[transition:transform_.4s_cubic-bezier(.21,1.02,.73,1)]",
  "transform-[translateY(calc(var(--island-index)*var(--island-gap)*-1))_scale(calc(1-var(--island-index)*.05))]",
  "data-expanded:transform-[translateY(calc(var(--island-index)*(100%+var(--island-gap))*-1))_scale(1)]",
  "after:absolute after:bottom-full after:left-0 after:h-[calc(var(--island-gap)+1px)] after:w-full after:content-['']",
  "motion-safe:animate-[island-enter_0.4s_cubic-bezier(.21,1.02,.73,1)]",
  "motion-reduce:transition-none"
);

/** Promote (sonner): the new front card unflips from its back-card pose into place. */
const ISLAND_PROMOTE_CLASS =
  "data-promoting:animate-[island-promote_0.4s_cubic-bezier(.21,1.02,.73,1)]";

/** Dismiss: the pill drops out of view; the store delete waits for the fade (requestDismiss). */
const ISLAND_EXIT_CLASS =
  "data-exiting:animate-[island-exit_0.3s_cubic-bezier(0.32,0,0.67,0)_forwards] data-exiting:pointer-events-none";

function collapseOrDismiss(
  foreground: AiIslandRun | undefined,
  setView: (v: IslandView) => void,
  requestDismiss: (id: string) => void
) {
  if (!foreground) {
    setView(null);
    return;
  }
  if (foreground.status === "running") {
    setView(null);
    return;
  }
  requestDismiss(foreground.id);
}

/** Fixed glyph column so check / AiLoader / pending dot share one optical box. */
function StepGlyph({ state }: { state: AiIslandStep["state"] }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center",
        state === "done" && "text-primary-foreground/70",
        state === "active" && "text-primary-foreground",
        state === "pending" && "text-primary-foreground/35"
      )}
      aria-hidden
    >
      {state === "done" ? (
        <CheckIcon className="size-3.5" strokeWidth={2} />
      ) : state === "active" ? (
        <AiLoader size="sm" variant="inline" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}

function TimelineSteps({ run }: { run: AiIslandRun }) {
  const steps = run.steps;
  const liveLabel = stripTrailingDots(run.activeStepLabel ?? "Working");

  if (steps.length === 0) {
    return (
      <p
        className="text-[13px] leading-snug font-medium text-primary-foreground"
        aria-live="polite"
      >
        {liveLabel}
      </p>
    );
  }

  return (
    <ul className="flex w-full min-w-56 flex-col gap-0.5">
      {steps.map((step) => {
        const label = stripTrailingDots(step.label);
        const isActive = step.state === "active";
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-2.5 py-0.5 text-[13px] leading-snug",
              isActive && "font-medium text-primary-foreground",
              step.state === "done" && "text-primary-foreground/65",
              step.state === "pending" && "text-primary-foreground/40"
            )}
          >
            <StepGlyph state={step.state} />
            <span className="min-w-0 flex-1 text-pretty tabular-nums">
              {isActive ? liveLabel || label : label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function IslandBeam({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant="colorful"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      strength={1}
      duration={2.3}
      borderRadius={DYNAMIC_ISLAND_RADIUS}
      className="inline-flex"
    >
      {children}
    </BorderBeam>
  );
}

function CompactRunCopy({
  title,
  step,
  running
}: {
  title: string;
  step: string;
  running: boolean;
}) {
  return (
    <>
      <WorkflowSolvingOrb size="toast" surface="inverted" paused={!running} />
      {/* Two-tier type: semibold title over a smaller muted step that shimmers while running. */}
      <span className="flex max-w-52 min-w-0 flex-col gap-1 pe-0.5" aria-hidden>
        <span className="truncate text-sm leading-tight font-semibold tracking-tight text-primary-foreground">
          {title}
        </span>
        <span
          className={cn(
            "truncate text-xs leading-tight font-normal text-primary-foreground/60 tabular-nums",
            running && "shimmer shimmer-color-primary-foreground"
          )}
        >
          {step}
        </span>
      </span>
    </>
  );
}

function StackPill({
  run,
  onSelect,
  interactive
}: {
  run: AiIslandRun;
  onSelect: (run: AiIslandRun) => void;
  interactive: boolean;
}) {
  const title = stripTrailingDots(run.title);
  const step = stripTrailingDots(run.activeStepLabel ?? "Working");
  const running = run.status === "running";
  return (
    <IslandBeam>
      <span
        className={cn("relative inline-flex items-center", GLASS_ISLAND_SHELL_CLASS)}
        style={{ borderRadius: DYNAMIC_ISLAND_RADIUS }}
      >
        <BadgeTopGlow variant="on-primary" />
        <button
          type="button"
          tabIndex={interactive ? 0 : -1}
          className={cn(
            "relative z-10 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-full px-5 py-2.5 text-left active:scale-[0.96]",
            // Matches the stacked front pill footprint (sonner uniform width).
            "w-80",
            onPrimaryFocus,
            !interactive && "pointer-events-none"
          )}
          aria-label={`Switch to ${title}: ${step}`}
          onClick={() => {
            onSelect(run);
          }}
        >
          {/* Collapsed back cards hide their content (sonner): only the surface peeks. */}
          <span
            className={cn(
              "flex min-w-0 items-center gap-2.5 transition-opacity duration-300 motion-reduce:transition-none",
              interactive ? "opacity-100" : "opacity-0"
            )}
          >
            <CompactRunCopy title={title} step={step} running={running} />
          </span>
        </button>
      </span>
    </IslandBeam>
  );
}

/** Touch / no-hover: pick another concurrent run while expanded. */
function TouchRunSwitcher({
  runs,
  foregroundId,
  onSelect
}: {
  runs: AiIslandRun[];
  foregroundId: string;
  onSelect: (run: AiIslandRun) => void;
}) {
  const others = runs.filter((run) => run.id !== foregroundId);
  if (others.length === 0) return null;

  return (
    <fieldset className="m-0 flex max-w-64 flex-wrap gap-1 border-0 p-0">
      <legend className="sr-only">Switch AI job</legend>
      {others.map((run) => (
        <button
          key={run.id}
          type="button"
          className={cn(
            "max-w-full truncate rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-2 py-1",
            "text-[10px] font-medium text-primary-foreground/80 hover:bg-primary-foreground/20 active:scale-[0.96]",
            onPrimaryFocus
          )}
          aria-label={`Switch to ${stripTrailingDots(run.title)}`}
          onClick={() => {
            onSelect(run);
          }}
        >
          {stripTrailingDots(run.title)}
        </button>
      ))}
    </fieldset>
  );
}

export function AiJobIslandHost() {
  // Must read the hook snapshot (React Compiler drops unused hook results).
  const islandState = useAiJobIsland();
  const navigate = useNavigate();
  const canHover = useHoverCapable();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<IslandView>(null);
  const [hovered, setHovered] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [syncKey, setSyncKey] = useState<string | null>(null);
  /** Runs playing their exit animation — removed from the store only after the fade. */
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);
  const exitTimersRef = useRef(new Map<string, number>());
  const reduceMotion = useReducedMotion();

  const runs = Object.values(islandState.runs).toSorted(islandRunRecency);
  const foreground = (() => {
    const { runs: byId, stealId } = islandState;
    if (stealId && byId[stealId]) return byId[stealId];
    const id = defaultForegroundId(runs);
    return id ? byId[id] : undefined;
  })();
  const runCount = runs.length;
  const nextSyncKey = foreground ? `${foreground.id}:${foreground.status}` : null;

  if (nextSyncKey !== syncKey) {
    setSyncKey(nextSyncKey);
    if (!foreground) {
      setView(null);
    } else if (foreground.status !== "running") {
      setView("result");
    } else if (view === "result") {
      setView(null);
    }
  }

  const removeRun = useCallback((id: string) => {
    const timer = exitTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      exitTimersRef.current.delete(id);
    }
    setExitingIds((prev) => prev.filter((exitId) => exitId !== id));
    dismissAiJobIsland(id);
  }, []);

  /** Animated dismiss: mark exiting (exit animation), remove from the store after the fade. */
  const requestDismiss = useCallback(
    (id: string) => {
      if (exitTimersRef.current.has(id)) return;
      if (reduceMotion) {
        removeRun(id);
        return;
      }
      setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      // Exit must win the cascade over a lingering promote animation.
      setPromoting(false);
      exitTimersRef.current.set(
        id,
        window.setTimeout(() => removeRun(id), 340)
      );
    },
    [reduceMotion, removeRun]
  );

  useEffect(() => {
    const timers = exitTimersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Store-side auto-dismiss (2.5s silent results) routes through the animated path too.
  useEffect(() => {
    setAiIslandAutoDismissHandler(requestDismiss);
    return () => {
      setAiIslandAutoDismissHandler(null);
    };
  }, [requestDismiss]);

  const onEscapeLike = useCallback(() => {
    collapseOrDismiss(getForegroundRun(), setView, requestDismiss);
  }, [requestDismiss]);

  useEffect(() => {
    if (view === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onEscapeLike();
    };

    const onPointerDown = (event: PointerEvent) => {
      const root = hostRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      onEscapeLike();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [view, onEscapeLike]);

  // Sonner promote: when the foreground changes in compact view, the new front
  // card unflips from its back-card pose into place.
  const prevForegroundIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevForegroundIdRef.current;
    prevForegroundIdRef.current = foreground?.id ?? null;
    if (prev && foreground?.id && prev !== foreground.id && view === null && !reduceMotion) {
      setPromoting(true);
    }
  }, [foreground?.id, view, reduceMotion]);

  // Collapsing a view releases focus and hover expansion: the pointer often
  // rests on the island anchor, and without this the stack re-expands the
  // moment a view closes. Re-hovering requires a genuine leave + re-enter.
  const prevViewRef = useRef<IslandView>(null);
  useEffect(() => {
    if (view === null && prevViewRef.current !== null) {
      setHovered(false);
      setFocusInside(false);
      const active = document.activeElement;
      if (active instanceof HTMLElement && hostRef.current?.contains(active)) active.blur();
    }
    prevViewRef.current = view;
  }, [view]);

  if (runCount === 0 || !foreground) return null;

  const selectRun = (run: AiIslandRun) => {
    focusIslandRun(run.id);
    setHovered(false);
    setFocusInside(false);
    setView(run.status === "running" ? "timeline" : "result");
  };

  const onCompactActivate = () => {
    const fg = getForegroundRun();
    if (!fg) return;
    setView(fg.status === "running" ? "timeline" : "result");
  };

  const onResultAction = () => {
    const fg = getForegroundRun();
    if (!fg?.resultAction) return;
    const { to, onClick } = fg.resultAction;
    if (to) {
      void navigate({ to: to as never });
    }
    onClick?.();
    requestDismiss(fg.id);
  };

  const showStack = canHover && runCount > 1 && view === null;
  const otherRuns = showStack ? runs.filter((run) => run.id !== foreground.id) : [];
  const stackExpanded = showStack && (hovered || focusInside);
  const showTouchSwitcher = !canHover && runCount > 1 && view !== null;
  const running = foreground.status === "running";

  const title = stripTrailingDots(foreground.title);
  const liveStep = stripTrailingDots(foreground.activeStepLabel ?? "Working");
  const compactLabel = running
    ? `${title}. ${liveStep}.${runCount > 1 ? ` ${runCount} jobs.` : ""} Expand for steps.`
    : `${stripTrailingDots(foreground.resultTitle ?? foreground.title)}.${runCount > 1 ? ` ${runCount} jobs.` : ""} Expand result.`;

  const compactNode = (
    <button
      type="button"
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-full text-left active:scale-[0.96]",
        // Sonner uniform width: every card in the stack shares one footprint.
        showStack && "w-80",
        onPrimaryFocus
      )}
      onClick={onCompactActivate}
      aria-expanded={view !== null}
      aria-label={compactLabel}
    >
      <CompactRunCopy title={title} step={liveStep} running={running} />
      {runCount > 1 ? (
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-semibold text-primary-foreground tabular-nums"
          aria-hidden
        >
          {runCount}
        </span>
      ) : null}
    </button>
  );

  const isForegroundExiting = exitingIds.includes(foreground.id);

  // Lives on the stack root: the shell wrapper and each back-card wrapper bubble
  // their exit/promote animations here. Child shimmer/beam animations are
  // filtered out by name.
  const onStackAnimationEnd = (event: ReactAnimationEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (event.animationName === "island-exit") {
      const id = target.dataset.runId;
      if (id) removeRun(id);
      return;
    }
    if (event.animationName === "island-promote") {
      setPromoting(false);
    }
  };

  const shellNode = (
    <IslandBeam>
      <DynamicIsland view={view} compact={compactNode} appearance="glass" label={title}>
        <DynamicIslandView
          id="timeline"
          className="w-[min(19.5rem,calc(100vw-2.5rem))] flex-col items-stretch gap-3"
        >
          <div className="flex flex-col gap-1.5 border-b border-primary-foreground/10 pb-3">
            {/* Optical center: title + Cancel share one midline (better-ui). */}
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 pe-1 text-sm leading-snug font-semibold tracking-tight text-pretty text-primary-foreground">
                {title}
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                // Island radius 32 + ~16–20 pad → inner ~12–16 (rounded-xl).
                className={cn(onPrimaryOutline, onPrimaryFocus, "shrink-0 rounded-xl")}
                onClick={() => {
                  foreground.onCancel();
                }}
              >
                {foreground.cancelLabel ?? "Cancel"}
              </Button>
            </div>
            {showTouchSwitcher ? (
              <TouchRunSwitcher runs={runs} foregroundId={foreground.id} onSelect={selectRun} />
            ) : null}
          </div>
          <TimelineSteps run={foreground} />
        </DynamicIslandView>

        <DynamicIslandView
          id="result"
          className="w-[min(19.5rem,calc(100vw-2.5rem))] flex-col items-stretch gap-3"
        >
          <div className="flex items-start gap-3">
            {/* Optical nudge: orb midline ≈ title cap height */}
            <WorkflowSolvingOrb
              size="toast"
              surface="inverted"
              paused
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-0.5 pe-0.5">
                  <p className="text-sm leading-snug font-semibold tracking-tight text-balance text-primary-foreground">
                    {stripTrailingDots(foreground.resultTitle ?? foreground.title)}
                  </p>
                  {foreground.errorMessage ? (
                    <p className="text-xs leading-relaxed text-pretty text-primary-foreground/70">
                      {foreground.errorMessage}
                    </p>
                  ) : foreground.status === "success" && foreground.requiresAction ? (
                    <p className="text-xs leading-relaxed text-primary-foreground/60">
                      Ready when you are
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className={cn(onPrimaryGhost, onPrimaryFocus, "-mt-0.5 shrink-0 rounded-xl")}
                  aria-label="Dismiss"
                  onClick={() => {
                    requestDismiss(foreground.id);
                  }}
                >
                  <XIcon aria-hidden />
                </Button>
              </div>
              {showTouchSwitcher ? (
                <div className="mt-2">
                  <TouchRunSwitcher runs={runs} foregroundId={foreground.id} onSelect={selectRun} />
                </div>
              ) : null}
            </div>
          </div>
          {foreground.resultAction ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                onPrimaryOutline,
                onPrimaryFocus,
                "h-8 w-full justify-center rounded-xl"
              )}
              onClick={onResultAction}
            >
              {foreground.resultAction.label}
            </Button>
          ) : null}
        </DynamicIslandView>
      </DynamicIsland>
    </IslandBeam>
  );

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-40 overflow-visible",
        // Keep clear of home-indicator / notched insets on phones.
        "bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))]"
      )}
    >
      {/* Expanded shell is a region (not live); keep step announcements here. */}
      {view !== null && running ? (
        <p className="sr-only" role="status" aria-live="polite">
          {`${title}: ${liveStep}`}
        </p>
      ) : null}
      <div
        ref={hostRef}
        className={cn(
          "pointer-events-auto relative isolate flex flex-col items-start overflow-visible",
          "[--island-gap:--spacing(3)]"
        )}
        onPointerEnter={() => {
          if (canHover) setHovered(true);
        }}
        onPointerLeave={() => {
          setHovered(false);
        }}
        onFocus={(event) => {
          // Mouse clicks also focus — only keyboard focus may pin the stack open.
          if (!canHover) return;
          if (!(event.target instanceof HTMLElement) || !event.target.matches(":focus-visible")) {
            return;
          }
          setFocusInside(true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          setFocusInside(false);
        }}
        data-expanded={stackExpanded ? "" : undefined}
        data-hovered={hovered ? "" : undefined}
        onAnimationEnd={onStackAnimationEnd}
      >
        {/* beam.jakubantalik.com/pulse — breathing border on the opaque island shell */}
        <div
          data-run-id={foreground.id}
          data-exiting={isForegroundExiting ? "" : undefined}
          data-promoting={promoting ? "" : undefined}
          aria-hidden={isForegroundExiting || undefined}
          className={cn("relative z-20", ISLAND_PROMOTE_CLASS, ISLAND_EXIT_CLASS)}
        >
          {shellNode}
        </div>

        {otherRuns.map((run, i) => (
          <div
            key={run.id}
            data-run-id={run.id}
            data-expanded={stackExpanded ? "" : undefined}
            data-exiting={exitingIds.includes(run.id) ? "" : undefined}
            aria-hidden={!stackExpanded}
            className={cn(ISLAND_STACK_ITEM_CLASS, ISLAND_EXIT_CLASS)}
            style={{ "--island-index": i + 1, zIndex: 20 - (i + 1) } as CSSProperties}
          >
            <StackPill run={run} onSelect={selectRun} interactive={stackExpanded} />
          </div>
        ))}
      </div>
    </div>
  );
}
