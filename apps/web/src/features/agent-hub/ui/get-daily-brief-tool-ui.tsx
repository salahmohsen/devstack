"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

export function GetDailyBriefToolUI({
  result
}: ToolCallMessagePartProps<Record<string, never>, { inboxCount?: number }>) {
  if (result == null) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Gathering today…
      </p>
    );
  }
  return null;
}
