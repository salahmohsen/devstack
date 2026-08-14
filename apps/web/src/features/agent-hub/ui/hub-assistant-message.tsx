"use client";

import { useAuiState } from "@assistant-ui/react";

import { AssistantMessage } from "@/shared/ui/assistant-ui/thread";

import { hideHubAssistantTextAfterIndex } from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

/**
 * Hub assistant bubble: the HITL confirmation card is the UI. Do not render
 * wrap-up prose ("awaiting your confirmation") after a pending card.
 */
export function HubAssistantMessage() {
  const hideTextAfterIndex = useAuiState((s) => hideHubAssistantTextAfterIndex(s.message.parts));
  return <AssistantMessage hideTextAfterIndex={hideTextAfterIndex} />;
}
