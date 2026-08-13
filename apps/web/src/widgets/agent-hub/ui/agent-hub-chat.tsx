import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

import { useHubChat, useListSuspendedRunsQuery } from "@/features/agent-hub";

import { AgentHubThread } from "./agent-hub-thread";

/**
 * Dashboard hub chat. Must render under HubChatProvider + AssistantRuntimeProvider
 * (dashboard layout). Thread primitives, day separators, and load-older live in
 * AgentHubThread.
 */
export function AgentHubChat() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <HubSuspendedRunBanner />
      <AgentHubThread />
    </div>
  );
}

function HubSuspendedRunBanner() {
  const { messages, historyReady, status } = useHubChat();
  const isStreaming = status === "submitted" || status === "streaming";
  const [dismissed, setDismissed] = React.useState(false);
  const isEmpty = historyReady && messages.length === 0 && !isStreaming;
  const suspendedQuery = useListSuspendedRunsQuery(isEmpty && !dismissed);

  const suspendedRuns = (Array.isArray(suspendedQuery.data) ? suspendedQuery.data : []) as Array<{
    runId: string;
    toolCalls: Array<{ toolName: string; toolCallId: string }>;
  }>;

  const showBanner = isEmpty && !dismissed && suspendedRuns.length > 0 && !suspendedQuery.isLoading;

  if (!showBanner) return null;

  return (
    <Alert variant="warning" className="shrink-0 rounded-none border-x-0 border-t-0">
      <AlertTitle>Pending tool approval</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          A previous hub run is waiting for approval
          {suspendedRuns[0]?.toolCalls[0]?.toolName
            ? ` (${suspendedRuns[0].toolCalls[0].toolName})`
            : ""}
          . If no approval card appears after history restore, the snapshot may be too old — start a
          new request or dismiss.
        </span>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>
  );
}
