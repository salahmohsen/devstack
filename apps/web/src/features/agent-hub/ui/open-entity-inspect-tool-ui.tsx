"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import { clearDailyBriefRequest } from "@/features/agent-hub/lib/daily-brief-host-store";
import { requestEntityInspect } from "@/features/agent-hub/lib/entity-inspect-host-store";
import {
  isOpenEntityInspectToolName,
  openEntityInspectActivityLabel,
  parseOpenEntityInspectInput,
  parseOpenEntityInspectOutput,
  type OpenEntityFormKind,
  type OpenEntityInspectInput,
  type OpenEntityInspectOutput
} from "@/features/agent-hub/lib/hub-tool-names";

const OPEN_ENTITY_INSPECT_TOOL_ID = "open-entity-inspect";

export function OpenEntityInspectToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<OpenEntityInspectInput, OpenEntityInspectOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const completedRef = React.useRef(false);
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);

  const resolvedToolName = isOpenEntityInspectToolName(toolName ?? "")
    ? (toolName as string)
    : OPEN_ENTITY_INSPECT_TOOL_ID;

  const parsed = parseOpenEntityInspectInput(args);
  const completed = parseOpenEntityInspectOutput(result);

  const complete = React.useCallback(
    (output: OpenEntityInspectOutput) => {
      if (completedRef.current) return;
      completedRef.current = true;
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
    if (completed) completedRef.current = true;
  }, [completed]);

  React.useEffect(() => {
    if (completed || completedRef.current) return;
    if (status?.type === "running") return;

    const input = parseOpenEntityInspectInput(args);
    if (!input) {
      complete({
        ok: false,
        kind: "project",
        opened: false
      });
      return;
    }

    if (!onLatest) {
      complete({
        ok: true,
        kind: input.kind,
        id: input.id,
        opened: false
      });
      return;
    }

    clearDailyBriefRequest();
    requestEntityInspect({
      requestId: toolCallId,
      kind: input.kind,
      id: input.id,
      toolCallId,
      toolName: resolvedToolName
    });
    complete({
      ok: true,
      kind: input.kind,
      id: input.id,
      opened: true
    });
  }, [args, complete, completed, onLatest, resolvedToolName, status?.type, toolCallId]);

  if (completed) {
    const noun =
      completed.kind === "project"
        ? "project"
        : completed.kind === "stack"
          ? "stack"
          : "experience";
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        {completed.opened ? `Opened ${noun} in the side panel.` : `Could not open ${noun}.`}
      </p>
    );
  }

  const kind: OpenEntityFormKind = parsed?.kind ?? "project";
  return (
    <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
      {openEntityInspectActivityLabel(kind)}
    </p>
  );
}
