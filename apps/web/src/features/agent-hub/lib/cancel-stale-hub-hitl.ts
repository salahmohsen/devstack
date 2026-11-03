import { type UIMessage } from "ai";

import {
  hubToolNameFromPart,
  isHubToolUiPart,
  isHubApprovalToolName,
  isOpenDailyBriefToolName,
  isOpenEntityFormToolName,
  isOpenEntityInspectToolName,
  isProposeApplicationFromJdToolName,
  isHubCrmWriteConfirmToolName,
  isProposeBatchGeneratePackagesToolName,
  isProposeBatchTrackingChangeToolName,
  isProposeCertificationChangeToolName,
  isProposeEducationChangeToolName,
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
import { recalledTriageAction } from "./hub-triage-action-memory";

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
    isProposeEducationChangeToolName(name) ||
    isProposeCertificationChangeToolName(name) ||
    isProposeMailCrmChangeToolName(name) ||
    isHubCrmWriteConfirmToolName(name) ||
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
    return (
      parseProposeNewJobsTriageOutput(part.output) != null ||
      recalledTriageAction(part.toolCallId ?? "") != null
    );
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

/** Approval-gated tools still waiting for Approve or Decline. */
export function waitingHubApprovalCards(messages: readonly UIMessage[]): WaitingHubHitl[] {
  const waiting: WaitingHubHitl[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      const part = raw as HubToolNamePart;
      if (!isHubToolUiPart(part)) continue;
      const toolCallId = part.toolCallId ?? "";
      if (!toolCallId) continue;
      const name = hubToolNameFromPart(part);
      const requested = part.state === "approval-requested";
      if (!requested && !(isHubApprovalToolName(name) && isWaitingState(part.state))) continue;
      waiting.push({ toolCallId, toolName: name, messageId: message.id });
    }
  }
  return waiting;
}

/**
 * Deny waiting approval parts locally, without a server round trip or resume.
 * Used when history hydrates or the user clears a pending approval whose
 * approval id is gone: the suspended run cannot be answered from here anyway.
 */
export function sealHubApprovalCards(
  messages: readonly UIMessage[],
  cards: readonly WaitingHubHitl[] = waitingHubApprovalCards(messages)
): { messages: UIMessage[]; cancelledIds: string[] } {
  if (cards.length === 0) return { messages: messages as UIMessage[], cancelledIds: [] };
  const ids = new Set(cards.map((card) => card.toolCallId));
  const next = messages.map((message) => {
    if (message.role !== "assistant") return message;
    let changed = false;
    const parts = (message.parts ?? []).map((raw) => {
      const part = raw as HubToolNamePart & { approval?: { id?: string } };
      if (!part.toolCallId || !ids.has(part.toolCallId)) return raw;
      changed = true;
      return {
        ...part,
        state: "output-denied",
        approval: {
          id: part.approval?.id ?? `local::${part.toolCallId}`,
          approved: false,
          reason: "cancelled"
        }
      };
    });
    return changed ? ({ ...message, parts } as UIMessage) : message;
  });
  return { messages: next, cancelledIds: cards.map((card) => card.toolCallId) };
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
  if (isProposeBatchGeneratePackagesToolName(toolName)) {
    return { action: "cancel", ids: [] };
  }
  if (isProposeBatchTrackingChangeToolName(toolName)) {
    return { action: "cancel", trackingAction: "track", ids: [] };
  }
  return { action: "cancel" };
}

/**
 * Seal waiting Confirm cards into cancelled outputs before the first paint.
 * Post-paint remount cancel + live GenUI cards race and can lock the main thread
 * (especially multiple propose-from-jd cards each kicking preview/take queries).
 */
export function sealWaitingHubHitlOnRemount(messages: readonly UIMessage[]): {
  messages: UIMessage[];
  cancelledIds: string[];
} {
  const approvals = sealHubApprovalCards(messages);
  const sealedApprovals = approvals.messages;
  const waiting = waitingHubConfirmCards(sealedApprovals);
  if (waiting.length === 0) return approvals;

  const cancelById = new Map(waiting.map((card) => [card.toolCallId, card.toolName]));
  const next = sealedApprovals.map((message) => {
    if (message.role !== "assistant") return message;
    let changed = false;
    const parts = (message.parts ?? []).map((raw) => {
      const part = raw as HubToolNamePart;
      const toolCallId = part.toolCallId ?? "";
      const toolName = cancelById.get(toolCallId);
      if (!toolName) return raw;
      changed = true;
      return {
        ...part,
        state: "output-available",
        output: cancelOutputForHubHitl(toolName)
      };
    });
    return changed ? ({ ...message, parts } as UIMessage) : message;
  });

  return {
    messages: next,
    cancelledIds: [...approvals.cancelledIds, ...waiting.map((card) => card.toolCallId)]
  };
}
