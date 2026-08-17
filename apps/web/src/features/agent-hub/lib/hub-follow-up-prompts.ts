import { userTurnAsksDailyBrief } from "@tsu-stack/core";

import {
  isGetDailyBriefToolName,
  isGetSearchBriefToolName,
  lastHubHitlKind
} from "./hub-tool-names";

const AFTER_TODAY = [
  "What's the latest on my applications?",
  "Anything new in the pile?",
  "Any mail that matters?"
] as const;

const AFTER_BRIEF = ["What do you have today?", "Anything new in the pile?"] as const;

const DEFAULT_FOLLOW_UPS = [
  "What do you have today?",
  "Anything new in the pile?",
  "Any mail that matters?"
] as const;

function messageText(message: { parts?: readonly { type?: string; text?: string }[] }): string {
  return (message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function toolName(part: { type?: string; toolName?: string }): string {
  if (typeof part.toolName === "string" && part.toolName.length > 0) return part.toolName;
  if (typeof part.type === "string" && part.type.startsWith("tool-")) return part.type.slice(5);
  return "";
}

function lastUserText(messages: readonly { role?: string; parts?: readonly unknown[] }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role !== "user") continue;
    return messageText(messages[i] as { parts?: readonly { type?: string; text?: string }[] });
  }
  return "";
}

function lastAssistantHasTool(
  messages: readonly { role?: string; parts?: readonly unknown[] }[],
  match: (name: string) => boolean
): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    for (const raw of message.parts ?? []) {
      if (!raw || typeof raw !== "object") continue;
      if (match(toolName(raw as { type?: string; toolName?: string }))) return true;
    }
    break;
  }
  return false;
}

/** Everyday follow-ups after a settled hub turn. Empty while HITL is waiting. */
export function hubFollowupPrompts(
  messages: readonly { role?: string; parts?: readonly unknown[] }[]
): string[] {
  if (messages.length === 0) return [];
  if (lastHubHitlKind(messages as never)) return [];
  const lastUser = lastUserText(messages);
  if (userTurnAsksDailyBrief(lastUser) || lastAssistantHasTool(messages, isGetDailyBriefToolName)) {
    return [...AFTER_TODAY];
  }
  if (
    /looking for|job rules|search brief/i.test(lastUser) ||
    lastAssistantHasTool(messages, isGetSearchBriefToolName)
  ) {
    return [...AFTER_BRIEF];
  }
  return [...DEFAULT_FOLLOW_UPS];
}
