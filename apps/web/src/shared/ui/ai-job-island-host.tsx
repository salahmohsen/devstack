"use client";

import { useNavigate } from "@tanstack/react-router";
import { BorderBeam } from "border-beam";
import { CheckIcon, XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  defaultForegroundId,
  dismissAiJobIsland,
  focusIslandRun,
  getForegroundRun,
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
  DynamicIslandView
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

function collapseOrDismiss(foreground: AiIslandRun | undefined, setView: (v: IslandView) => void) {
  if (!foreground) {
    setView(null);
    return;
  }
  if (foreground.status === "running") {
    setView(null);
    return;
  }
  dismissAiJobIsland(foreground.id);
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
        className="text-sm leading-snug font-medium text-primary-foreground motion-safe:shimmer"
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
              "flex items-center gap-2.5 py-0.5 text-sm leading-snug",
              isActive && "font-medium text-primary-foreground",
              step.state === "done" && "text-primary-foreground/65",
              step.state === "pending" && "text-primary-foreground/40"
            )}
          >
            <StepGlyph state={step.state} />
            <span
              className={cn(
                "min-w-0 flex-1 text-pretty tabular-nums",
                // Keep text-primary-foreground on the shimmer node so currentColor resolves on primary glass.
                isActive && "text-primary-foreground motion-safe:shimmer"
              )}
            >
              {isActive ? liveLabel || label : label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StackPill({ run, onSelect }: { run: AiIslandRun; onSelect: (run: AiIslandRun) => void }) {
  const title = stripTrailingDots(run.title);
  const step = stripTrailingDots(run.activeStepLabel ?? "Working");
  return (
    <button
      type="button"
      className={cn(
        "inline-flex max-w-72 cursor-pointer items-center gap-2.5 rounded-full px-5 py-2.5",
        "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24",
        "inset-shadow-[0_1px_--theme(--color-white/16%)] active:scale-[0.96]",
        onPrimaryFocus
      )}
      aria-label={`Switch to ${title}: ${step}`}
      onClick={() => {
        onSelect(run);
      }}
    >
      <WorkflowSolvingOrb size="toast" surface="inverted" />
      <span className="flex max-w-52 min-w-0 flex-col gap-0.5 pe-0.5">
        <span className="truncate text-sm leading-snug font-medium text-primary-foreground">
          {title}
        </span>
        <span className="truncate text-sm leading-snug font-medium text-primary-foreground motion-safe:shimmer">
          {step}
        </span>
      </span>
    </button>
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
  const { resolvedTheme } = useTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<IslandView>(null);
  const [hovered, setHovered] = useState(false);
  const [syncKey, setSyncKey] = useState<string | null>(null);

  const runs = Object.values(islandState.runs).toSorted((a, b) => b.updatedAt - a.updatedAt);
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
      setHovered(false);
      setView("result");
    } else if (view === "result") {
      setView(null);
    }
  }

  const onEscapeLike = useCallback(() => {
    collapseOrDismiss(getForegroundRun(), setView);
  }, []);

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

  if (runCount === 0 || !foreground) return null;

  const selectRun = (run: AiIslandRun) => {
    focusIslandRun(run.id);
    setHovered(false);
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
    dismissAiJobIsland(fg.id);
  };

  const showHoverStack = canHover && hovered && runCount > 1 && view === null;
  const otherRuns = showHoverStack ? runs.filter((run) => run.id !== foreground.id) : [];
  const showTouchSwitcher = !canHover && runCount > 1 && view !== null;
  const running = foreground.status === "running";

  const title = stripTrailingDots(foreground.title);
  const liveStep = stripTrailingDots(foreground.activeStepLabel ?? "Working");
  const compactLabel = running
    ? `${title}. ${liveStep}. Expand for steps.`
    : `${stripTrailingDots(foreground.resultTitle ?? foreground.title)}. Expand result.`;

  const compactNode = (
    <button
      type="button"
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-full text-left active:scale-[0.96]",
        onPrimaryFocus
      )}
      onClick={onCompactActivate}
      aria-expanded={view !== null}
      aria-label={compactLabel}
    >
      <WorkflowSolvingOrb size="toast" surface="inverted" paused={!running} />
      <span className="flex max-w-52 min-w-0 flex-col gap-0.5 pe-0.5" aria-hidden>
        <span className="truncate text-sm leading-snug font-medium text-primary-foreground">
          {title}
        </span>
        <span
          className={cn(
            "truncate text-sm leading-snug font-medium text-primary-foreground",
            running && "motion-safe:shimmer"
          )}
        >
          {liveStep}
        </span>
      </span>
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
        className="pointer-events-auto flex flex-col items-start gap-2 overflow-visible"
        onPointerEnter={() => {
          if (canHover) setHovered(true);
        }}
        onPointerLeave={() => {
          setHovered(false);
        }}
        data-hovered={hovered ? "" : undefined}
      >
        {otherRuns.length > 0 ? (
          <div className="flex flex-col items-start gap-1.5" aria-label="Other AI jobs">
            {otherRuns.map((run) => (
              <StackPill key={run.id} run={run} onSelect={selectRun} />
            ))}
          </div>
        ) : null}

        {/* beam.jakubantalik.com/pulse — breathing border on the opaque island shell */}
        <BorderBeam
          size="pulse-inner"
          colorVariant="colorful"
          theme={resolvedTheme === "light" ? "light" : "dark"}
          strength={1}
          duration={2.3}
          borderRadius={DYNAMIC_ISLAND_RADIUS}
          className="inline-flex"
        >
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
                        dismissAiJobIsland(foreground.id);
                      }}
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </div>
                  {showTouchSwitcher ? (
                    <div className="mt-2">
                      <TouchRunSwitcher
                        runs={runs}
                        foregroundId={foreground.id}
                        onSelect={selectRun}
                      />
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
        </BorderBeam>
      </div>
    </div>
  );
}
