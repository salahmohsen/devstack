"use client";

import { type UIMessage } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub";
import { applicationCountQueryKeys, applicationsQueryKeys } from "@/features/applications";

type HubToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  output?: unknown;
};

/** Tools that mutate applications from the shared hub thread. */
const HUB_APPLICATION_MUTATING_TOOLS = new Set([
  "create-application",
  "createApplication",
  "generate-apply-package",
  "generateApplyPackage"
]);

function getToolName(part: HubToolPart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type === "dynamic-tool") return "tool";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function isToolPart(part: HubToolPart): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function isSuccessfulMutatingToolOutput(toolName: string, output: unknown): boolean {
  if (!output || typeof output !== "object" || Array.isArray(output)) return false;
  const o = output as { applicationId?: unknown; created?: unknown; ok?: unknown };

  if (toolName === "create-application" || toolName === "createApplication") {
    const id = typeof o.applicationId === "string" ? o.applicationId.trim() : "";
    return id.length > 0;
  }

  if (toolName === "generate-apply-package" || toolName === "generateApplyPackage") {
    // Tool returns { applicationId } on success; some shapes may use ok.
    if (o.ok === false) return false;
    const id = typeof o.applicationId === "string" ? o.applicationId.trim() : "";
    return id.length > 0;
  }

  return false;
}

function collectSuccessfulToolCallIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const raw of msg.parts ?? []) {
      const part = raw as HubToolPart;
      if (!isToolPart(part)) continue;
      const toolName = getToolName(part);
      if (!HUB_APPLICATION_MUTATING_TOOLS.has(toolName)) continue;
      if (part.state !== "output-available") continue;
      if (!isSuccessfulMutatingToolOutput(toolName, part.output)) continue;
      const toolCallId = part.toolCallId ?? "";
      if (toolCallId) ids.push(toolCallId);
    }
  }
  return ids;
}

async function invalidateAllApplicationSurfaces(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("inbox") }),
    queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("tracked") }),
    queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("dismissed") }),
    queryClient.invalidateQueries({ queryKey: applicationCountQueryKeys.byStatus("inbox") })
  ]);
}

/**
 * Dashboard-global: watch shared hub chat and invalidate New / Tracked / Dismissed
 * lists + inbox badge when create-application or generate-apply-package succeeds.
 *
 * Must run under HubChatProvider (dashboard layout).
 */
export function useInvalidateApplicationsOnHubTools(): void {
  const queryClient = useQueryClient();
  const { messages } = useHubChat();
  const seenSuccessIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const successIds = collectSuccessfulToolCallIds(messages);
    if (successIds.length === 0) return;

    let shouldInvalidate = false;
    for (const id of successIds) {
      if (!seenSuccessIdsRef.current.has(id)) {
        seenSuccessIdsRef.current.add(id);
        shouldInvalidate = true;
      }
    }
    if (!shouldInvalidate) return;

    void invalidateAllApplicationSurfaces(queryClient);
  }, [messages, queryClient]);
}
