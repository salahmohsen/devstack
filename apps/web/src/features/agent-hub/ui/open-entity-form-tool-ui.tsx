"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { requestEntityForm } from "@/features/agent-hub/lib/entity-form-host-store";
import {
  isOpenEntityFormToolName,
  openEntityFormActivityLabel,
  parseOpenEntityFormInput,
  parseOpenEntityFormOutput,
  type OpenEntityFormInput,
  type OpenEntityFormKind,
  type OpenEntityFormOutput
} from "@/features/agent-hub/lib/hub-tool-names";

const OPEN_ENTITY_FORM_TOOL_ID = "open-entity-form";

function isWaitingToolState(state: string | undefined): boolean {
  return (
    state === "input-available" ||
    state === "input-streaming" ||
    state === "call" ||
    state === "partial-call"
  );
}

function latestPendingOpenEntityFormId(
  messages: Array<{ role?: string; parts?: readonly unknown[] }>
): string | null {
  for (const msg of [...messages].toReversed()) {
    if (msg.role !== "assistant") continue;
    for (const raw of [...(msg.parts ?? [])].toReversed()) {
      const part = raw as {
        type?: string;
        toolName?: string;
        toolCallId?: string;
        state?: string;
        output?: unknown;
      };
      const type = part.type ?? "";
      const isTool = type.startsWith("tool-") || type === "dynamic-tool";
      if (!isTool) continue;
      const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
      if (!isOpenEntityFormToolName(name)) continue;
      if (!isWaitingToolState(part.state)) continue;
      if (parseOpenEntityFormOutput(part.output)) continue;
      const id = part.toolCallId ?? "";
      if (id) return id;
    }
  }
  return null;
}

function receiptLabel(output: OpenEntityFormOutput): string {
  const noun =
    output.kind === "project" ? "project" : output.kind === "stack" ? "stack" : "experience";
  if (output.saved) return `Saved ${noun}`;
  if (output.cancelled) return `Cancelled ${noun} form`;
  return openEntityFormActivityLabel(output.kind);
}

/**
 * Client complete for openEntityForm: ask the dashboard host to remount the
 * original sheet. Host addToolOutput after save/cancel.
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
  const completed = parseOpenEntityFormOutput(result);

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
    if (result != null) return;
    if (completedRef.current) return;
    if (status?.type === "running") return;

    const input = parseOpenEntityFormInput(args);
    if (!input) {
      complete({
        ok: false,
        kind: "experience",
        saved: false,
        cancelled: true
      });
      return;
    }

    const latestId = latestPendingOpenEntityFormId(messages);
    if (latestId && latestId !== toolCallId) {
      complete({
        ok: true,
        kind: input.kind,
        ...(input.id ? { id: input.id } : {}),
        saved: false,
        cancelled: true
      });
      return;
    }

    requestEntityForm({
      requestId: toolCallId,
      kind: input.kind,
      id: input.id,
      toolCallId,
      toolName: resolvedToolName
    });

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const raw of msg.parts ?? []) {
        const part = raw as {
          type?: string;
          toolName?: string;
          toolCallId?: string;
          state?: string;
        };
        const type = part.type ?? "";
        const isTool = type.startsWith("tool-") || type === "dynamic-tool";
        if (!isTool) continue;
        const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
        if (!isOpenEntityFormToolName(name)) continue;
        const id = part.toolCallId ?? "";
        if (!id || id === toolCallId) continue;
        if (!isWaitingToolState(part.state)) continue;
        void addToolOutput({
          tool: name,
          toolCallId: id,
          output: {
            ok: true,
            kind: input.kind,
            saved: false,
            cancelled: true
          }
        });
      }
    }
  }, [addToolOutput, args, complete, messages, result, resolvedToolName, status?.type, toolCallId]);

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
