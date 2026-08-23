"use client";

import { type UIMessage } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import {
  hubToolNameFromPart,
  isHubToolUiPart,
  useHubChat,
  type HubToolNamePart
} from "@/features/agent-hub";
import {
  applicationCountQueryKeys,
  invalidateApplicationsListQueries
} from "@/features/applications";

/** Tools that mutate applications from the shared hub thread. */
const HUB_APPLICATION_MUTATING_TOOLS = new Set([
  "create-application",
  "createApplication",
  "generate-apply-package",
  "generateApplyPackage",
  "accept-apply-package",
  "acceptApplyPackage",
  "send-apply-outreach",
  "sendApplyOutreach",
  "track-job",
  "trackJob",
  "dismiss-job",
  "dismissJob",
  "update-application-stage",
  "updateApplicationStage",
  "add-application-note",
  "addApplicationNote",
  "restore-application",
  "restoreApplication",
  "propose-application-field-change",
  "proposeApplicationFieldChange",
  "propose-set-outcome",
  "proposeSetOutcome",
  "propose-delete-application",
  "proposeDeleteApplication",
  "propose-delete-note",
  "proposeDeleteNote",
  "propose-batch-tracking-change",
  "proposeBatchTrackingChange",
  "propose-refresh-from-url",
  "proposeRefreshFromUrl"
]);

function isSuccessfulMutatingToolOutput(toolName: string, output: unknown): boolean {
  if (!output || typeof output !== "object" || Array.isArray(output)) return false;
  const o = output as {
    applicationId?: unknown;
    created?: unknown;
    ok?: unknown;
    action?: unknown;
  };

  // Prefer explicit ok when present.
  if (o.ok === false) return false;
  if (o.ok === true) return true;
  if (o.action === "cancel" || o.action === "dismiss") return false;
  if (o.action === "confirm") return true;

  if (toolName === "create-application" || toolName === "createApplication") {
    const id = typeof o.applicationId === "string" ? o.applicationId.trim() : "";
    return id.length > 0;
  }

  if (toolName === "generate-apply-package" || toolName === "generateApplyPackage") {
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
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      const toolName = hubToolNameFromPart(part);
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
    invalidateApplicationsListQueries(queryClient),
    queryClient.invalidateQueries({ queryKey: applicationCountQueryKeys.byStatus("inbox") })
  ]);
}

/**
 * Dashboard-global: watch shared hub chat and invalidate New / Tracked / Dismissed
 * lists + inbox badge when superpowers CRM tools succeed.
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
