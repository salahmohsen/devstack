"use client";

import { type UIMessage } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub";
import { applicationsQueryKeys } from "@/features/applications";

type HubToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  output?: unknown;
};

const CREATE_APPLICATION_TOOL_NAMES = new Set(["create-application", "createApplication"]);

function getToolName(part: HubToolPart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type === "dynamic-tool") return "tool";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function isToolPart(part: HubToolPart): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

/**
 * True when create-application finished with a real application id
 * (`created: true` insert, or create-if-absent that returned an existing row).
 */
function isSuccessfulCreateOutput(output: unknown): boolean {
  if (!output || typeof output !== "object" || Array.isArray(output)) return false;
  const o = output as { applicationId?: unknown; created?: unknown };
  const id = typeof o.applicationId === "string" ? o.applicationId.trim() : "";
  return id.length > 0;
}

function collectSuccessfulCreateToolCallIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const raw of msg.parts ?? []) {
      const part = raw as HubToolPart;
      if (!isToolPart(part)) continue;
      if (!CREATE_APPLICATION_TOOL_NAMES.has(getToolName(part))) continue;
      if (part.state !== "output-available") continue;
      if (!isSuccessfulCreateOutput(part.output)) continue;
      const toolCallId = part.toolCallId ?? "";
      if (toolCallId) ids.push(toolCallId);
    }
  }
  return ids;
}

/**
 * Watch the shared hub chat stream on the Applications page and invalidate
 * the applications list when `create-application` succeeds — so the board
 * updates after Save / package without a full reload.
 */
export function useInvalidateApplicationsOnHubCreate(): void {
  const queryClient = useQueryClient();
  const { messages } = useHubChat();
  const seenSuccessIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const successIds = collectSuccessfulCreateToolCallIds(messages);
    if (successIds.length === 0) return;

    let shouldInvalidate = false;
    for (const id of successIds) {
      if (!seenSuccessIdsRef.current.has(id)) {
        seenSuccessIdsRef.current.add(id);
        shouldInvalidate = true;
      }
    }
    if (!shouldInvalidate) return;

    void queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
  }, [messages, queryClient]);
}
