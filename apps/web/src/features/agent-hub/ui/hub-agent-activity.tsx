"use client";

import { useAuiState, useMessageTiming } from "@assistant-ui/react";
import { type PropsWithChildren } from "react";

import { userTurnAsksDailyBrief } from "@tsu-stack/core";

import { AgentActivity } from "@/shared/ui/agents/agent-activity";
import { ThinkingShimmer } from "@/shared/ui/agents/thinking-shimmer";
import { SubagentList } from "@/shared/ui/subagent-list";

import {
  buildHubAgentActivityItems,
  buildTodayLetterActivityItems,
  hubAgentActivityActiveLabel,
  hubAgentActivityCollapseOnComplete,
  hubAgentActivityStatus,
  isHubListingExtractActive
} from "@/features/agent-hub/lib/hub-agent-activity";
import { getHubComposerModel } from "@/features/agent-hub/lib/hub-composer-model";
import { buildHubSubagentListModel } from "@/features/agent-hub/lib/hub-subagent-workers";

function messageHasReasoning(parts: readonly unknown[]): boolean {
  return parts.some((raw) => 
    Boolean(
      raw && typeof raw === "object" && (raw as { type?: string }).type === "reasoning"
    )
  );
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
  const askedToday = useAuiState((s) => {
    for (let i = s.thread.messages.length - 1; i >= 0; i--) {
      const message = s.thread.messages[i];
      if (message?.role !== "user") continue;
      const text = (message.parts ?? [])
        .filter((part) => part.type === "text" && "text" in part && typeof part.text === "string")
        .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
        .join("\n")
        .trim();
      return userTurnAsksDailyBrief(text);
    }
    return false;
  });
  const messageParts = parts ?? [];
  const todayItems = buildTodayLetterActivityItems({
    parts: messageParts,
    planWhileWaiting: isRunning && askedToday
  });
  const items = [...todayItems, ...buildHubAgentActivityItems(messageParts)];
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

  const reasoningOwnsChrome = messageHasReasoning(messageParts) && items.length === 0;
  const activity = reasoningOwnsChrome ? null : items.length === 0 || extractOnly ? (
    status !== "working" && !extractOnly ? null : (
      <output
        className="flex h-7 w-full max-w-[min(72ch,100%)] items-center text-sm text-muted-foreground"
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
      collapseOnComplete={hubAgentActivityCollapseOnComplete(messageId === lastMessageId)}
      maxHeight={208}
      activeLabel={hubAgentActivityActiveLabel(items, messageParts)}
      className="max-w-[min(72ch,100%)]"
    />
  );

  if (!workers) return activity;

  return (
    <div className="flex max-w-[min(72ch,100%)] flex-col gap-2">
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
