import { type UIMessage } from "ai";

export type HubToolOutputWrite = {
  toolCallId: string;
  state?: "output-available" | "output-error";
  output?: unknown;
  errorText?: string;
};

type PartLike = { toolCallId?: string; state?: string };

const RESOLVED_STATES = new Set(["output-available", "output-error", "output-denied"]);

export function hubToolCallIsOnLastMessage(
  messages: readonly UIMessage[],
  toolCallId: string
): boolean {
  const last = messages.at(-1);
  if (!last || !toolCallId) return false;
  return (last.parts ?? []).some((raw) => (raw as PartLike).toolCallId === toolCallId);
}

/**
 * `Chat.addToolOutput` only rewrites the last message, so a result for a card
 * on an older message is silently dropped. This writes it into any message and
 * reports which calls actually changed; already-resolved parts are left alone.
 */
export function writeHubToolOutputs(
  messages: readonly UIMessage[],
  writes: readonly HubToolOutputWrite[]
): { messages: UIMessage[]; changedIds: string[] } {
  const byId = new Map(writes.map((write) => [write.toolCallId, write]));
  const changedIds: string[] = [];
  const next = messages.map((message) => {
    if (message.role !== "assistant") return message;
    let changed = false;
    const parts = (message.parts ?? []).map((raw) => {
      const part = raw as PartLike;
      const write = part.toolCallId ? byId.get(part.toolCallId) : undefined;
      if (!write || (part.state && RESOLVED_STATES.has(part.state))) return raw;
      changed = true;
      changedIds.push(write.toolCallId);
      return {
        ...part,
        state: write.state ?? "output-available",
        output: write.output,
        errorText: write.errorText
      };
    });
    return changed ? ({ ...message, parts } as UIMessage) : message;
  });
  return { messages: changedIds.length > 0 ? next : (messages as UIMessage[]), changedIds };
}
