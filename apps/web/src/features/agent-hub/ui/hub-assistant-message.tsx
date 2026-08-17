"use client";

import { type ToolCallMessagePartProps, useAuiState } from "@assistant-ui/react";

import { hubPersonalityAvatarSeed } from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";

import { AssistantMessage, ThreadComponentsContext } from "@/shared/ui/assistant-ui/thread";
import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { useApplicationsByTrackingQuery } from "@/features/agent-hub/api/applications-by-tracking.query";
import {
  useDismissInboxJobMutation,
  usePromoteInboxJobMutation
} from "@/features/agent-hub/api/create-from-jd.mutation";
import { isHubWorkingStripToolName } from "@/features/agent-hub/lib/hub-agent-activity";
import { hubMessagePersonality } from "@/features/agent-hub/lib/hub-message-personality";
import { cancelledTriageCardInputFromParts } from "@/features/agent-hub/lib/hub-tool-names";
import {
  recalledTriageAction,
  rememberTriageAction
} from "@/features/agent-hub/lib/hub-triage-action-memory";
import {
  hideHubAssistantTextAfterIndex,
  isHubProcessorLeakText
} from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

import { HubAgentActivity, HubBareToolGroup, HubHiddenReasoningGroup } from "./hub-agent-activity";
import { NewJobsTriageCard } from "./new-jobs-triage-card";

function HubToolFallback(props: ToolCallMessagePartProps) {
  if (isHubWorkingStripToolName(props.toolName ?? "")) {
    return null;
  }
  return <ToolFallback {...props} />;
}

const HUB_MESSAGE_THREAD_COMPONENTS = {
  ToolFallback: HubToolFallback,
  ToolGroup: HubBareToolGroup,
  ReasoningGroup: HubHiddenReasoningGroup
};

function HubCancelledTriageReceipt({ hidden }: { hidden: boolean }) {
  const parts = useAuiState((s) => s.message.parts ?? []);
  const messageId = useAuiState((s) => s.message.id);
  const isLastMessage = useAuiState((s) => s.thread.messages.at(-1)?.id === s.message.id);
  const inboxQuery = useApplicationsByTrackingQuery("inbox");
  const promoteInboxJob = usePromoteInboxJobMutation();
  const dismissInboxJob = useDismissInboxJobMutation();
  const inboxJobs = (inboxQuery.data ?? []).map((row) => {
    return {
      id: row.id,
      title: row.title,
      companyName: row.companyName,
      matchScore: row.matchScore ?? null
    };
  });
  const input = cancelledTriageCardInputFromParts(parts, inboxJobs);
  const recalled = recalledTriageAction(messageId);
  if (hidden || !input) return null;
  const completedAction = recalled ?? (isLastMessage ? null : "cancel");
  return (
    <NewJobsTriageCard
      toolCallId={messageId}
      input={input}
      completedAction={completedAction}
      onSubmit={async (output) => {
        rememberTriageAction(messageId, output.action);
        if (output.action !== "confirm") return;
        await Promise.all([
          ...output.trackIds.map((id) => promoteInboxJob.mutateAsync({ id })),
          ...output.dismissIds.map((id) => dismissInboxJob.mutateAsync({ id }))
        ]);
      }}
    />
  );
}

/**
 * Hub assistant bubble: working strip is Agent Activity; HITL cards stay
 * the confirmation UI. Hide wrap-up prose after a pending card.
 */
export function HubAssistantMessage() {
  const hideTextAfterIndex = useAuiState((s) => hideHubAssistantTextAfterIndex(s.message.parts));
  const messageId = useAuiState((s) => s.message.id);
  const isLastMessage = useAuiState((s) => s.thread.messages.at(-1)?.id === s.message.id);
  const threadRunning = useAuiState((s) => s.thread.isRunning);
  const messageRunning = useAuiState((s) => s.message.status?.type === "running");
  const metadata = useAuiState((s) => s.message.metadata);
  const personality = hubMessagePersonality(messageId, metadata);
  const animated = Boolean(messageRunning || (threadRunning && isLastMessage));
  return (
    <ThreadComponentsContext.Provider value={HUB_MESSAGE_THREAD_COMPONENTS}>
      <div className="flex w-full max-w-[min(72ch,100%)] items-start gap-2.5">
        <AgentAvatar
          seed={hubPersonalityAvatarSeed(personality)}
          size={28}
          animated={animated}
          className="mt-0.5 shrink-0"
          aria-label={personality}
        />
        <div className="min-w-0 flex-1">
          <HubAgentActivity />
          <AssistantMessage
            hideTextAfterIndex={hideTextAfterIndex}
            shouldHideTextPart={isHubProcessorLeakText}
          />
          <HubCancelledTriageReceipt hidden={animated} />
        </div>
      </div>
    </ThreadComponentsContext.Provider>
  );
}
