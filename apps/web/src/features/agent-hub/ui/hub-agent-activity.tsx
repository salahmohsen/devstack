"use client";

import { useAuiState, useMessageTiming } from "@assistant-ui/react";
import { type PropsWithChildren } from "react";

import { AgentActivity } from "@/shared/ui/agents/agent-activity";
import { ThinkingShimmer } from "@/shared/ui/agents/thinking-shimmer";

import {
  buildHubAgentActivityItems,
  hubAgentActivityActiveLabel,
  hubAgentActivityStatus,
  isHubListingExtractActive
} from "@/features/agent-hub/lib/hub-agent-activity";

/** Drop assistant-ui reasoning chrome — the activity strip owns that text. */
export function HubHiddenReasoningGroup(_props: PropsWithChildren) {
  return null;
}

/** Keep HITL cards; drop the "N tools" chrome around them. */
export function HubBareToolGroup({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function HubAgentActivity() {
  const parts = useAuiState((s) => s.message.parts);
  const messageId = useAuiState((s) => s.message.id);
  const lastMessageId = useAuiState((s) => s.thread.messages.at(-1)?.id);
  const threadRunning = useAuiState((s) => s.thread.isRunning);
  const timing = useMessageTiming();
  const isRunning = Boolean(threadRunning && messageId === lastMessageId);
  const messageParts = parts ?? [];
  const items = buildHubAgentActivityItems(messageParts);
  const status = hubAgentActivityStatus({ items, parts: messageParts, isRunning });
  const durationSec =
    timing?.totalStreamTime != null && Number.isFinite(timing.totalStreamTime)
      ? timing.totalStreamTime / 1000
      : 0;
  const extractOnly =
    items.length === 1 && items[0]?.type === "step" && isHubListingExtractActive(messageParts);

  if (items.length === 0 || extractOnly) {
    if (status !== "working" && !extractOnly) return null;
    return (
      <output
        className="mb-2 flex h-7 w-full max-w-[min(72ch,100%)] items-center text-sm text-muted-foreground"
        aria-live="polite"
      >
        <ThinkingShimmer>{hubAgentActivityActiveLabel(items, messageParts)}</ThinkingShimmer>
      </output>
    );
  }

  return (
    <AgentActivity
      items={items}
      status={status}
      duration={durationSec}
      collapseOnComplete
      maxHeight={208}
      activeLabel={hubAgentActivityActiveLabel(items, messageParts)}
      className="mb-2 max-w-[min(72ch,100%)]"
    />
  );
}
