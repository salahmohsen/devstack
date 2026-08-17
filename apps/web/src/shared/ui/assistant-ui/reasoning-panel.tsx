"use client";

import { useAuiState, useMessageTiming } from "@assistant-ui/react";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import { cn } from "@tsu-stack/ui/lib/utils";

import { take } from "@/shared/ui/range";
import { collapsePanel, mono, ShimmerLabel } from "@/shared/ui/surfaces";

import {
  formatReasoningDuration,
  parseReasoningSteps,
  type ReasoningStep
} from "./parse-reasoning-steps";

export type { ReasoningStep };

export type ReasoningPanelProps = {
  steps: ReasoningStep[];
  visibleSteps: number;
  streaming: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restingLabel: string;
  elapsed?: string;
  className?: string;
};

export function ReasoningPanel({
  steps,
  visibleSteps,
  streaming,
  open,
  onOpenChange,
  restingLabel,
  elapsed,
  className
}: ReasoningPanelProps) {
  const shown = take(steps, visibleSteps);

  return (
    <Collapsible
      data-slot="reasoning-panel"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger className="group/trigger flex items-center gap-1.5 py-1 text-[13.5px] text-foreground/55 transition-[color,scale] outline-none hover:text-foreground/90 active:scale-[0.98]">
        {streaming ? (
          <span className="flex items-center gap-1.5 text-start">
            <ShimmerLabel active className="relative inline-block leading-none">
              Thinking
            </ShimmerLabel>
            {elapsed !== undefined ? (
              <span className={cn(mono, "text-foreground/30 tabular-nums")}>{elapsed}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-start">{restingLabel}</span>
        )}
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-panel-open/trigger:rotate-180 group-data-open/trigger:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        <ol className="flex flex-col gap-4 pt-3 pb-1">
          {shown.map((step, index) => {
            const active = streaming && index === shown.length - 1;
            return (
              <li
                key={`${step.title}-${index}`}
                className="flex animate-in gap-3 duration-300 fill-mode-both fade-in slide-in-from-bottom-1"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.75 size-1.25 shrink-0 rounded-full transition-colors duration-300",
                    active ? "animate-pulse bg-blue-500 dark:bg-blue-400" : "bg-foreground/20"
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[13.5px] font-medium text-foreground/90">{step.title}</p>
                  {step.body ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed wrap-break-word text-foreground/50">
                      {step.body}
                    </p>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

type ReasoningGroupLike = {
  status?: { type?: string };
  indices?: readonly number[];
};

function reasoningPartText(part: Record<string, unknown>): string | null {
  if (typeof part.text === "string" && part.text.trim()) return part.text;
  if (typeof part.reasoning === "string" && part.reasoning.trim()) return part.reasoning;
  if (typeof part.content === "string" && part.content.trim()) return part.content;
  return null;
}

function textsFromGroup(parts: readonly unknown[], indices: readonly number[]): string[] {
  const texts: string[] = [];
  for (const index of indices) {
    const part = parts[index];
    if (!part || typeof part !== "object") continue;
    const row = part as Record<string, unknown>;
    if (row.type !== "reasoning") continue;
    const text = reasoningPartText(row);
    if (text) texts.push(text);
  }
  return texts;
}

/** Grouped reasoning parts as the official thought list (not the bordered card). */
export function ReasoningPanelGroup({
  group,
  className
}: {
  group: ReasoningGroupLike;
  children?: ReactNode;
  className?: string;
}) {
  const parts = useAuiState((state) => state.message.parts ?? []);
  const timing = useMessageTiming();
  const streaming = group.status?.type === "running";
  const steps = parseReasoningSteps(textsFromGroup(parts, group.indices ?? []));
  const timed =
    timing?.totalStreamTime != null && Number.isFinite(timing.totalStreamTime)
      ? timing.totalStreamTime / 1000
      : 0;
  const [clock, setClock] = useState(0);
  const startedAt = useRef<number | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!streaming) return;
    startedAt.current ??= Date.now();
    const tick = () => setClock((Date.now() - (startedAt.current ?? Date.now())) / 1000);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [streaming]);

  const seconds = Math.max(timed, clock);

  if (steps.length === 0 && !streaming) return null;

  return (
    <ReasoningPanel
      steps={steps}
      visibleSteps={Math.max(steps.length, streaming ? 1 : 0)}
      streaming={streaming}
      open={open}
      onOpenChange={setOpen}
      restingLabel={seconds > 0 ? `Thought for ${formatReasoningDuration(seconds)}` : "Thought"}
      elapsed={streaming ? formatReasoningDuration(seconds) : undefined}
      className={className}
    />
  );
}
