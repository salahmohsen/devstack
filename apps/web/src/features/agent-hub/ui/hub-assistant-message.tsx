"use client";

import { type ToolCallMessagePartProps, useAuiState } from "@assistant-ui/react";

import { AssistantMessage, ThreadComponentsContext } from "@/shared/ui/assistant-ui/thread";
import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { isHubJobPageExtractToolName } from "@/features/agent-hub/lib/hub-tool-names";
import { hideHubAssistantTextAfterIndex } from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

import { HubAgentActivity, HubBareToolGroup, HubHiddenReasoningGroup } from "./hub-agent-activity";

function HubToolFallback(props: ToolCallMessagePartProps) {
  if (isHubJobPageExtractToolName(props.toolName ?? "")) {
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
  return (
    <ThreadComponentsContext.Provider value={HUB_MESSAGE_THREAD_COMPONENTS}>
      <HubAgentActivity />
      <AssistantMessage hideTextAfterIndex={hideTextAfterIndex} />
    </ThreadComponentsContext.Provider>
  );
}
