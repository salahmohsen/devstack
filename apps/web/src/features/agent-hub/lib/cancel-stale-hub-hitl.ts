import { type UIMessage } from "ai";

import {
  hubToolNameFromPart,
  isHubToolUiPart,
  isOpenDailyBriefToolName,
  isOpenEntityFormToolName,
  isOpenEntityInspectToolName,
  isProposeApplicationFromJdToolName,
  isProposeEvidenceChangeToolName,
  isProposeHardPreferenceChangeToolName,
  isProposeMailCrmChangeToolName,
  isProposeNewJobsTriageToolName,
  parseProposeApplicationFromJdOutputAction,
  parseProposeEvidenceChangeOutput,
  parseProposeHardPreferenceChangeOutput,
  parseProposeMailCrmChangeOutput,
  parseProposeNewJobsTriageOutput,
  parseOpenEntityFormOutput,
  parseOpenEntityInspectOutput,
  type HubToolNamePart
} from "./hub-tool-names";

function isWaitingState(state: string | undefined): boolean {
  return (
    state === "input-available" ||
    state === "input-streaming" ||
    state === "call" ||
    state === "partial-call"
  );
}

export function isHubConfirmHitlToolName(name: string): boolean {
  return (
    isProposeApplicationFromJdToolName(name) ||
    isProposeNewJobsTriageToolName(name) ||
    isProposeHardPreferenceChangeToolName(name) ||
    isProposeEvidenceChangeToolName(name) ||
    isProposeMailCrmChangeToolName(name) ||
    isOpenEntityFormToolName(name)
  );
}

export function toolCallIsOnLatestAssistant(
  messages: readonly UIMessage[],
  toolCallId: string
): boolean {
  if (!toolCallId) return false;
  const lastAssistant = [...messages].toReversed().find((message) => message.role === "assistant");
  if (!lastAssistant) return false;
  return (lastAssistant.parts ?? []).some((raw) => {
    const part = raw as { toolCallId?: string };
    return part.toolCallId === toolCallId;
  });
}

/** History remount should cancel these if they are not on the latest assistant message. */
export function isHubRemountCancelToolName(name: string): boolean {
  return (
    isHubConfirmHitlToolName(name) ||
    isOpenEntityInspectToolName(name) ||
    isOpenDailyBriefToolName(name)
  );
}

function alreadyCompleted(part: HubToolNamePart): boolean {
  const name = hubToolNameFromPart(part);
  if (isProposeApplicationFromJdToolName(name)) {
    return parseProposeApplicationFromJdOutputAction(part.output) != null;
  }
  if (isProposeNewJobsTriageToolName(name)) {
    return parseProposeNewJobsTriageOutput(part.output) != null;
  }
  if (isProposeHardPreferenceChangeToolName(name)) {
    return parseProposeHardPreferenceChangeOutput(part.output) != null;
  }
  if (isProposeEvidenceChangeToolName(name)) {
    return parseProposeEvidenceChangeOutput(part.output) != null;
  }
  if (isProposeMailCrmChangeToolName(name)) {
    return parseProposeMailCrmChangeOutput(part.output) != null;
  }
  if (isOpenEntityFormToolName(name)) {
    return parseOpenEntityFormOutput(part.output) != null;
  }
  if (isOpenEntityInspectToolName(name)) {
    return parseOpenEntityInspectOutput(part.output) != null;
  }
  if (isOpenDailyBriefToolName(name)) return part.output != null;
  return part.output != null;
}

export type WaitingHubHitl = {
  toolCallId: string;
  toolName: string;
  messageId: string;
};

export function waitingHubConfirmCards(messages: readonly UIMessage[]): WaitingHubHitl[] {
  const waiting: WaitingHubHitl[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      const name = hubToolNameFromPart(part);
      if (!isHubRemountCancelToolName(name)) continue;
      if (!isWaitingState(part.state)) continue;
      if (alreadyCompleted(part)) continue;
      const toolCallId = part.toolCallId ?? "";
      if (!toolCallId) continue;
      waiting.push({ toolCallId, toolName: name, messageId: message.id });
    }
  }
  return waiting;
}

/** Waiting Confirm cards that are not on the latest assistant message. */
export function staleWaitingHubConfirmCards(messages: readonly UIMessage[]): WaitingHubHitl[] {
  const lastAssistant = [...messages].toReversed().find((message) => message.role === "assistant");
  const latestId = lastAssistant?.id ?? "";
  return waitingHubConfirmCards(messages).filter((card) => card.messageId !== latestId);
}

export function cancelOutputForHubHitl(toolName: string): unknown {
  if (isProposeApplicationFromJdToolName(toolName)) return { action: "dismiss" };
  if (isProposeNewJobsTriageToolName(toolName)) {
    return { action: "cancel", trackIds: [], dismissIds: [] };
  }
  if (isProposeHardPreferenceChangeToolName(toolName)) return { action: "cancel" };
  if (isProposeEvidenceChangeToolName(toolName)) return { action: "cancel" };
  if (isProposeMailCrmChangeToolName(toolName)) return { action: "cancel" };
  if (isOpenEntityFormToolName(toolName)) {
    return { ok: true, kind: "project", saved: false, cancelled: true };
  }
  if (isOpenEntityInspectToolName(toolName)) {
    return { ok: true, kind: "project", opened: false };
  }
  if (isOpenDailyBriefToolName(toolName)) {
    return { opened: false, markdown: "" };
  }
  return { action: "cancel" };
}
