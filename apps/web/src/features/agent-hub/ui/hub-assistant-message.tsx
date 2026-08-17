"use client";

import { type ToolCallMessagePartProps, useAuiState } from "@assistant-ui/react";
import { useSyncExternalStore } from "react";

import { hubPersonalityAvatarSeed, userTurnAsksDailyBrief } from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";

import { AssistantMessage, ThreadComponentsContext } from "@/shared/ui/assistant-ui/thread";
import { HubTraceToolCall } from "@/shared/ui/assistant-ui/tool-call";
import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { useApplicationsByTrackingQuery } from "@/features/agent-hub/api/applications-by-tracking.query";
import {
  useDismissInboxJobMutation,
  usePromoteInboxJobMutation
} from "@/features/agent-hub/api/create-from-jd.mutation";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  humanizeHubToolName,
  isHubWorkingStripToolName
} from "@/features/agent-hub/lib/hub-agent-activity";
import {
  didHubHitlRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";
import { hubMessagePersonality } from "@/features/agent-hub/lib/hub-message-personality";
import {
  cancelledTriageCardInputFromParts,
  isGetDailyBriefToolName,
  isOpenDailyBriefToolName
} from "@/features/agent-hub/lib/hub-tool-names";
import {
  recalledTriageAction,
  rememberTriageAction
} from "@/features/agent-hub/lib/hub-triage-action-memory";
import {
  hideHubAssistantTextAfterIndex,
  isHubProcessorLeakText,
  isHubPromisedCatalogText,
  isHubTodayLetterPaste
} from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

import { HubAgentActivity, HubBareToolGroup } from "./hub-agent-activity";
import { NewJobsTriageCard } from "./new-jobs-triage-card";

function HubToolFallback(props: ToolCallMessagePartProps) {
  const name = props.toolName ?? "";
  if (!isHubWorkingStripToolName(name)) {
    return <ToolFallback {...props} />;
  }
  const part = props as ToolCallMessagePartProps & {
    input?: unknown;
    output?: unknown;
    state?: string;
  };
  const args = part.args ?? part.input;
  return (
    <HubTraceToolCall
      toolName={humanizeHubToolName(name, args)}
      args={args}
      result={part.result ?? part.output}
      status={part.status}
      state={part.state}
    />
  );
}

const HUB_MESSAGE_THREAD_COMPONENTS = {
  ToolFallback: HubToolFallback,
  ToolGroup: HubBareToolGroup
};

function HubCancelledTriageReceipt({ hidden, className }: { hidden: boolean; className?: string }) {
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
  const remounted = useSyncExternalStore(subscribeHubHitlRemount, didHubHitlRemount, () => false);
  if (hidden || !input) return null;
  const completedAction = recalled ?? (isLastMessage && !remounted ? null : "cancel");
  return (
    <NewJobsTriageCard
      toolCallId={messageId}
      input={input}
      completedAction={completedAction}
      className={className}
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
  const hideTodayChat = useAuiState((s) => {
    if (s.thread.messages.at(-1)?.id !== s.message.id) return false;
    let latestUser = "";
    for (let i = s.thread.messages.length - 1; i >= 0; i--) {
      const message = s.thread.messages[i];
      if (message?.role !== "user") continue;
      latestUser = (message.parts ?? [])
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
        .join("\n")
        .trim();
      break;
    }
    if (!userTurnAsksDailyBrief(latestUser)) return false;
    const hasPackedFollowUp = (s.message.parts ?? []).some((part) => {
      const name =
        "toolName" in part && typeof part.toolName === "string"
          ? part.toolName
          : typeof part.type === "string" && part.type.startsWith("tool-")
            ? part.type.slice(5)
            : "";
      if (!name || isGetDailyBriefToolName(name) || isOpenDailyBriefToolName(name)) return false;
      return /inspect|searchApplications|search-applications|searchMail|search-mail|getExperience|get-experience|getProject|get-project|listNewJobs|list-new-jobs/i.test(
        name
      );
    });
    return !hasPackedFollowUp;
  });
  const threadRunning = useAuiState((s) => s.thread.isRunning);
  const messageRunning = useAuiState((s) => s.message.status?.type === "running");
  const metadata = useAuiState((s) => s.message.metadata);
  const personality = hubMessagePersonality(messageId, metadata);
  const animated = Boolean(messageRunning || (threadRunning && isLastMessage));
  const { clearError, regenerate } = useHubChat();
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
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <HubAgentActivity />
          <AssistantMessage
            hideTextAfterIndex={hideTextAfterIndex}
            shouldHideTextPart={(text) =>
              isHubProcessorLeakText(text) ||
              isHubTodayLetterPaste(text) ||
              isHubPromisedCatalogText(text) ||
              (hideTodayChat && Boolean(text.trim()))
            }
            errorFeature="hub"
            onErrorRetry={() => {
              clearError();
              void regenerate();
            }}
          />
          <HubCancelledTriageReceipt hidden={animated} className="mt-6" />
        </div>
      </div>
    </ThreadComponentsContext.Provider>
  );
}
