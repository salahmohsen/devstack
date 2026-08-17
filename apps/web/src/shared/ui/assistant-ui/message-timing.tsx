"use client";

import { useMessageTiming } from "@assistant-ui/react";
import { type FC } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { daySeparatorMono } from "@/shared/ui/assistant-ui/day-separator";

function formatStreamDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds)}s`;
}

/**
 * Wall-clock stream duration from runtime `metadata.timing.totalStreamTime`.
 * Renders nothing when timing is missing (hydrated history, no stream).
 * Does not show estimated tok/s.
 */
export const MessageStreamDuration: FC<{ className?: string }> = ({ className }) => {
  const timing = useMessageTiming();
  const ms = timing?.totalStreamTime;
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;

  const label = formatStreamDuration(ms);

  return (
    <span
      data-slot="aui_message-stream-duration"
      className={cn(
        daySeparatorMono,
        "ms-2 inline-flex h-6 items-center leading-none text-muted-foreground/70 tabular-nums",
        "translate-y-px whitespace-nowrap",
        className
      )}
      title="Response time"
      aria-label={`Response time ${label}`}
    >
      {label}
    </span>
  );
};
