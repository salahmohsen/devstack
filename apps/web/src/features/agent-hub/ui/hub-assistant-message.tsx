"use client";

import { type ToolCallMessagePartProps, useAuiState } from "@assistant-ui/react";

import { hubPersonalityAvatarSeed } from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";

import { AssistantMessage, ThreadComponentsContext } from "@/shared/ui/assistant-ui/thread";
import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { isHubWorkingStripToolName } from "@/features/agent-hub/lib/hub-agent-activity";
import { hubMessagePersonality } from "@/features/agent-hub/lib/hub-message-personality";
import {
  hideHubAssistantTextAfterIndex,
  isHubProcessorLeakText
} from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

import { HubAgentActivity, HubBareToolGroup, HubHiddenReasoningGroup } from "./hub-agent-activity";

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

/**
 * Hub assistant bubble: working strip is Agent Activity; HITL cards stay
 * the confirmation UI. Hide wrap-up prose after a pending card.
 */
export function HubAssistantMessage() {
  const hideTextAfterIndex = useAuiState((s) => hideHubAssistantTextAfterIndex(s.message.parts));
  const messageId = useAuiState((s) => s.message.id);
  const metadata = useAuiState((s) => s.message.metadata);
  const personality = hubMessagePersonality(messageId, metadata);
  return (
    <ThreadComponentsContext.Provider value={HUB_MESSAGE_THREAD_COMPONENTS}>
      <div className="flex items-start gap-2.5">
        <AgentAvatar
          seed={hubPersonalityAvatarSeed(personality)}
          size={28}
          className="mt-0.5 shrink-0"
          aria-label={personality}
        />
        <div className="min-w-0 flex-1">
          <HubAgentActivity />
          <AssistantMessage
            hideTextAfterIndex={hideTextAfterIndex}
            shouldHideTextPart={isHubProcessorLeakText}
          />
        </div>
      </div>
    </ThreadComponentsContext.Provider>
  );
}
