"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { dismissEntityFormCalls } from "@/features/agent-hub/lib/entity-form-host-store";
import {
  findOpenEntityFormOutputInMessages,
  isOpenEntityFormToolName,
  openEntityFormActivityLabel,
  parseOpenEntityFormInput,
  parseOpenEntityFormOutput,
  type OpenEntityFormInput,
  type OpenEntityFormKind,
  type OpenEntityFormOutput
} from "@/features/agent-hub/lib/hub-tool-names";

const OPEN_ENTITY_FORM_TOOL_ID = "open-entity-form";

function receiptLabel(output: OpenEntityFormOutput): string {
  const noun =
    output.kind === "project" ? "project" : output.kind === "stack" ? "stack" : "experience";
  if (output.saved) return `Saved ${noun}`;
  if (output.cancelled) return `Cancelled ${noun} form`;
  return openEntityFormActivityLabel(output.kind);
}

/**
 * Leftover history parts: complete cancelled. Do not remount EntityFormHost.
 */
export function OpenEntityFormToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<OpenEntityFormInput, OpenEntityFormOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const completedRef = React.useRef(false);

  const resolvedToolName = isOpenEntityFormToolName(toolName ?? "")
    ? (toolName as string)
    : OPEN_ENTITY_FORM_TOOL_ID;

  const parsed = parseOpenEntityFormInput(args);
  const completed =
    parseOpenEntityFormOutput(result) ?? findOpenEntityFormOutputInMessages(messages, toolCallId);

  const complete = React.useCallback(
    (output: OpenEntityFormOutput) => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (typeof addResult === "function") {
        addResult(output);
      }
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

    const input = parseOpenEntityFormInput(args);
    const kind: OpenEntityFormKind = input?.kind ?? "experience";
    dismissEntityFormCalls([toolCallId]);
    complete({
      ok: true,
      kind,
      ...(input?.id ? { id: input.id } : {}),
      saved: false,
      cancelled: true
    });
  }, [args, complete, completed, status?.type, toolCallId]);

  if (completed) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        {receiptLabel(completed)}
      </p>
    );
  }

  const kind: OpenEntityFormKind = parsed?.kind ?? "experience";
  return (
    <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
      {openEntityFormActivityLabel(kind)}
    </p>
  );
}
