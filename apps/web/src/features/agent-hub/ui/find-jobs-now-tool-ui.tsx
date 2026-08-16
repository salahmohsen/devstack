"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { type FindJobsNowOutput } from "@tsu-stack/core";

import { enqueueFindJobsNow } from "@/shared/lib/find-jobs-now-job";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { isFindJobsNowToolName } from "@/features/agent-hub/lib/hub-tool-names";

const FIND_JOBS_NOW_TOOL_ID = "find-jobs-now";

export function FindJobsNowToolUI({
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<Record<string, never>, FindJobsNowOutput>) {
  const queryClient = useQueryClient();
  const { addToolOutput } = useHubChat();
  const completedRef = React.useRef(false);

  const resolvedToolName = isFindJobsNowToolName(toolName ?? "")
    ? (toolName as string)
    : FIND_JOBS_NOW_TOOL_ID;

  const complete = React.useCallback(
    (output: FindJobsNowOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (result != null) return;
    if (completedRef.current) return;
    if (status?.type === "running") return;
    completedRef.current = true;
    void enqueueFindJobsNow(queryClient).then(complete, () => {
      complete({
        enqueued: false,
        ingestTriggered: false,
        seats: 0,
        reason: "queue_unavailable"
      });
    });
  }, [complete, queryClient, result, status?.type]);

  if (result && typeof result === "object" && "reason" in result) {
    if (result.reason === "ok" && result.enqueued) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Search is queued{result.seats > 0 ? ` · ${result.seats} seats` : ""}.
        </p>
      );
    }
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Could not start search ({result.reason}).
      </p>
    );
  }

  return (
    <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">Finding jobs…</p>
  );
}
