import { type UIMessage } from "ai";

/** Automatic resumes allowed between two user messages. */
export const HUB_MAX_AUTO_RESUMES = 3;

const RESOLVED_STATES = new Set([
  "output-available",
  "output-error",
  "output-denied",
  "approval-responded"
]);

type PartLike = { toolCallId?: string; state?: string };

function latestUserTurnId(messages: readonly UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") return message.id || `idx:${i}`;
  }
  return "";
}

function resolvedToolCallIds(messages: readonly UIMessage[]): string[] {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return [];
  const ids: string[] = [];
  for (const raw of last.parts ?? []) {
    const part = raw as PartLike;
    if (part.toolCallId && part.state && RESOLVED_STATES.has(part.state)) {
      ids.push(part.toolCallId);
    }
  }
  return ids;
}

/**
 * Caps automatic resumes so a model that answers with empty text or another
 * client tool cannot loop. `tryConsume` is called once per resume decision that
 * the heuristics already approved, and records the tool calls that justified it.
 */
export function createHubResumeBudget(max = HUB_MAX_AUTO_RESUMES) {
  let turnId = "";
  let used = 0;
  let usedToolCallIds = new Set<string>();

  return {
    tryConsume(messages: readonly UIMessage[]): boolean {
      const turn = latestUserTurnId(messages);
      if (turn !== turnId) {
        turnId = turn;
        used = 0;
        usedToolCallIds = new Set();
      }
      if (used >= max) return false;
      const ids = resolvedToolCallIds(messages);
      // Same resolved calls as an earlier resume means the model did not move on.
      if (ids.length > 0 && ids.every((id) => usedToolCallIds.has(id))) return false;
      for (const id of ids) usedToolCallIds.add(id);
      used += 1;
      return true;
    },
    reset() {
      turnId = "";
      used = 0;
      usedToolCallIds = new Set();
    }
  };
}
