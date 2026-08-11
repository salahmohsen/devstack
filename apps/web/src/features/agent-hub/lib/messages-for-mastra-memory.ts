import { type UIMessage } from "ai";

/**
 * Build the `messages` body for hub → Mastra chat when Memory is enabled.
 *
 * Mastra docs: with memory, send **only the newest user message** — the agent
 * loads thread history from storage. Sending the full client history duplicates
 * turns (conflicting timestamps / double injection) and shows as answer rewrite
 * thrash (answer A → vanishes → answer B).
 *
 * @see https://mastra.ai/docs/memory/message-history
 * @see https://mastra.ai/course (handling memory frontend)
 *
 * HITL resume: when the last message is assistant (tool output / approval),
 * send that assistant message only so chatRoute can extract approvals / tool
 * results — still no full history.
 */
export function messagesForMastraMemoryChat(
  messages: UIMessage[],
  trigger: "submit-message" | "regenerate-message"
): UIMessage[] {
  if (messages.length === 0) return messages;

  if (trigger === "regenerate-message") {
    // Drop the assistant message being regenerated; re-send last user only.
    const withoutTrailingAssistant =
      messages[messages.length - 1]?.role === "assistant" ? messages.slice(0, -1) : messages;
    const lastUser = [...withoutTrailingAssistant].toReversed().find((m) => m.role === "user");
    return lastUser ? [lastUser] : withoutTrailingAssistant.slice(-1);
  }

  const last = messages[messages.length - 1];
  if (!last) return messages;

  // Tool / approval auto-resume: last message is assistant with client tool output
  // or approval response. chatRoute v6 reads approvals from that message.
  if (last.role === "assistant") {
    return [last];
  }

  // Normal turn: newest user message only.
  if (last.role === "user") {
    return [last];
  }

  return [last];
}
