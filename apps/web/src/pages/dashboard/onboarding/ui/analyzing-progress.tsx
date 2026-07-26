"use client";

import { CheckIcon, CircleIcon, Loader2Icon } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

const PIPELINE = [
  { id: "prepare", label: "Preparing resume text" },
  { id: "extract", label: "Extracting experience and skills" },
  { id: "normalize", label: "Normalizing fields" },
  { id: "format", label: "Building review draft" }
] as const;

function matchPipelineIndex(stepLabel: string | null): number {
  if (!stepLabel) return -1;
  const lower = stepLabel.toLowerCase();
  if (lower.includes("prepar") || lower === "prepare") return 0;
  if (lower.includes("extract") || lower.includes("experience") || lower.includes("skill")) {
    return 1;
  }
  if (lower.includes("normal")) return 2;
  if (lower.includes("build") || lower.includes("format") || lower.includes("draft")) return 3;
  if (lower.includes("init")) return 0;
  return -1;
}

export function AnalyzingProgress({
  stepLabel,
  isRunning
}: {
  stepLabel: string | null;
  isRunning: boolean;
}) {
  const activeIndex = matchPipelineIndex(stepLabel);
  const progressValue =
    activeIndex < 0
      ? isRunning
        ? 12
        : 0
      : Math.min(100, ((activeIndex + 1) / PIPELINE.length) * 100);

  return (
    <div className="flex w-full flex-col gap-5" aria-live="polite" aria-busy={isRunning}>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none",
            isRunning && activeIndex < 0 && "w-1/6 motion-safe:animate-pulse"
          )}
          style={activeIndex >= 0 ? { width: `${progressValue}%` } : undefined}
        />
      </div>

      <ol className="flex flex-col gap-3">
        {PIPELINE.map((item, index) => {
          const done = activeIndex > index || (!isRunning && activeIndex === PIPELINE.length - 1);
          const active = isRunning && activeIndex === index;
          const pending = !done && !active;

          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none",
                active && "border-primary/40 bg-primary/5",
                done && "border-border/80 bg-muted/30",
                pending && "border-transparent bg-transparent opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  pending && "border-border text-muted-foreground"
                )}
              >
                {done ? (
                  <CheckIcon className="size-3.5" aria-hidden />
                ) : active ? (
                  <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CircleIcon className="size-3 opacity-40" aria-hidden />
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active && "font-medium text-foreground",
                  done && "text-muted-foreground",
                  pending && "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      {stepLabel && isRunning ? (
        <p className="text-center text-xs text-muted-foreground">
          <span className="motion-safe:animate-pulse">{stepLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
