"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { DefaultLoader } from "@/shared/ui/default-loader";

const PIPELINE = [
  { id: "download", label: "Downloading resume" },
  { id: "prepare", label: "Preparing resume text" },
  { id: "extract", label: "Extracting experience and skills" },
  { id: "normalize", label: "Normalizing fields" },
  { id: "format", label: "Building review draft" }
] as const;

function matchPipelineIndex(stepLabel: string | null): number {
  if (!stepLabel) return -1;
  const lower = stepLabel.toLowerCase();
  if (lower.includes("download") || lower.includes("start")) return 0;
  if (lower.includes("prepar") || lower.includes("pdf") || lower === "prepare") return 1;
  if (lower.includes("extract") || lower.includes("experience") || lower.includes("skill")) {
    return 2;
  }
  if (lower.includes("normal")) return 3;
  if (lower.includes("build") || lower.includes("format") || lower.includes("draft")) return 4;
  return 0;
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

  const barValue = isRunning && activeIndex < 0 ? 12 : progressValue;
  const activeLabel =
    activeIndex >= 0 && activeIndex < PIPELINE.length
      ? PIPELINE[activeIndex]?.label
      : isRunning
        ? "Starting analysis"
        : "Analysis progress";

  return (
    <div className="flex w-full flex-col gap-4" aria-live="polite" aria-busy={isRunning}>
      <progress
        className="h-1 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-foreground/80 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground/80"
        max={100}
        value={barValue}
        aria-label={activeLabel}
      />

      <ol className="flex flex-col gap-1">
        {PIPELINE.map((item, index) => {
          const done = activeIndex > index || (!isRunning && activeIndex === PIPELINE.length - 1);
          const active = isRunning && activeIndex === index;
          const pending = !done && !active;

          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-1 py-1.5",
                pending && "opacity-45"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center",
                  done && "text-foreground",
                  active && "text-foreground",
                  pending && "text-muted-foreground"
                )}
                aria-hidden
              >
                {done ? (
                  <CheckIcon className="size-3.5" />
                ) : active ? (
                  <DefaultLoader size="sm" variant="inline" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                )}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  // Shimmer is decorative motion; fall back to static weight under reduced motion
                  active && "font-medium text-foreground motion-safe:shimmer",
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
    </div>
  );
}
