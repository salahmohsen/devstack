"use client";

import { useAuiState, useMessageTiming } from "@assistant-ui/react";
import { type PropsWithChildren } from "react";

import { AgentActivity } from "@/shared/ui/agents/agent-activity";
import { ThinkingShimmer } from "@/shared/ui/agents/thinking-shimmer";
import { SubagentList } from "@/shared/ui/subagent-list";

import {
  buildHubAgentActivityItems,
  hubAgentActivityActiveLabel,
  hubAgentActivityStatus,
  isHubListingExtractActive
} from "@/features/agent-hub/lib/hub-agent-activity";
import { getHubComposerModel } from "@/features/agent-hub/lib/hub-composer-model";
import { buildHubSubagentListModel } from "@/features/agent-hub/lib/hub-subagent-workers";

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
  const modelId = getHubComposerModel()?.modelId ?? "";
  const modelLabel = modelId.includes("/")
    ? (modelId.split("/").pop() ?? modelId)
    : modelId || "BYO";
  const workers = buildHubSubagentListModel(messageParts, { modelLabel, isRunning });

  const activity =
    items.length === 0 || extractOnly ? (
      status !== "working" && !extractOnly ? null : (
        <output
          className="mb-2 flex h-7 w-full max-w-[min(72ch,100%)] items-center text-sm text-muted-foreground"
          aria-live="polite"
        >
          <ThinkingShimmer>{hubAgentActivityActiveLabel(items, messageParts)}</ThinkingShimmer>
        </output>
      )
    ) : (
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

  if (!workers) return activity;

  return (
    <div className="mb-2 flex max-w-[min(72ch,100%)] flex-col gap-2">
      <SubagentList
        agents={workers.agents}
        completedCount={workers.completedCount}
        progress={workers.progress}
        showSummary={workers.showSummary}
        summaryAgent={workers.summaryAgent}
        className="min-h-0 max-w-xs"
      />
      {activity}
    </div>
  );
}
