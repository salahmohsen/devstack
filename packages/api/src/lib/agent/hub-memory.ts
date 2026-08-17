/**
 * Hub chat Memory keys for Mastra.
 *
 * Mastra Agent.stream / chatRoute resolve Memory from `options.memory.thread`
 * and `options.memory.resource` only (not top-level `threadId` / `resourceId`
 * on the prepare-stream path). Auth middleware owns requestContext resourceId
 * via mapUserToResourceId; still pass memory.resource for explicit scoping.
 *
 * @see https://mastra.ai/docs (chatRoute memory body)
 */

import { userHubStateRepository } from "@tsu-stack/db";

/** Registered agent id for the dashboard hub supervisor. */
export const HUB_CHAT_AGENT_ID = "hub-supervisor" as const;

/**
 * Agents allowed on `agent.chat` / `agent.chatStream`.
 * Keep narrow — BYO keys + stream proxy must not target arbitrary agent ids.
 */
export const CHAT_ALLOWED_AGENT_IDS = [
  HUB_CHAT_AGENT_ID,
  "stack-categorizer",
  "provider-ping"
] as const;

export type ChatAllowedAgentId = (typeof CHAT_ALLOWED_AGENT_IDS)[number];

/**
 * Multi-step bound for hub chat (align with hub-supervisor defaultOptions.maxSteps).
 * Superpowers golden path + last-step final answer (triage → package → send → notifs).
 * Answer-rewrite / bubble churn is fixed by anti-rewrite instructions + UI
 * intermediate-text collapse — not by locking maxSteps to 1.
 */
export const HUB_CHAT_MAX_STEPS = 16 as const;

/**
 * Mastra memory thread for hub chat.
 * Epoch 0 keeps the original `dashboard-home:{userId}` id for existing threads.
 * `/new` bumps epoch so the next session is `dashboard-home:{userId}:e{n}`.
 */
export function hubChatThreadId(userId: string, epoch: number = 0): string {
  const n = Number.isFinite(epoch) && epoch > 0 ? Math.floor(epoch) : 0;
  if (n <= 0) return `dashboard-home:${userId}`;
  return `dashboard-home:${userId}:e${n}`;
}

/** Body fragment for `/chat/:agentId` and `/agents/:id/generate`. */
export function hubChatMemoryOptions(
  userId: string,
  epoch: number = 0
): {
  memory: { thread: string; resource: string };
} {
  return {
    memory: {
      thread: hubChatThreadId(userId, epoch),
      resource: userId
    }
  };
}

/** Load current hub chat epoch + thread keys for this session user. */
export async function resolveHubChatMemory(userId: string): Promise<{
  epoch: number;
  threadId: string;
  memory: { thread: string; resource: string };
}> {
  const epoch = await userHubStateRepository.getHubChatEpoch(userId);
  return {
    epoch,
    threadId: hubChatThreadId(userId, epoch),
    memory: hubChatMemoryOptions(userId, epoch).memory
  };
}

export function isChatAllowedAgentId(agentId: string): agentId is ChatAllowedAgentId {
  return (CHAT_ALLOWED_AGENT_IDS as readonly string[]).includes(agentId);
}

type ThinUiMessage = { role?: string; id?: string; parts?: unknown[] };

/**
 * Memory-backed hub chat: forward only the message Mastra needs for this turn.
 * Full client history + Memory lastMessages duplicates context and causes
 * multi-step rewrite thrash. Mirrors web `messagesForMastraMemoryChat`.
 *
 * @see https://mastra.ai/docs/memory/message-history
 */
export function slimMessagesForHubMemory(
  messages: unknown[],
  trigger: "submit-message" | "regenerate-message" = "submit-message"
): unknown[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const list = messages as ThinUiMessage[];

  if (trigger === "regenerate-message") {
    const withoutTrailing = list[list.length - 1]?.role === "assistant" ? list.slice(0, -1) : list;
    for (let i = withoutTrailing.length - 1; i >= 0; i--) {
      if (withoutTrailing[i]?.role === "user") return [withoutTrailing[i]];
    }
    return withoutTrailing.slice(-1);
  }

  const last = list[list.length - 1];
  if (!last) return messages;
  if (last.role === "assistant" || last.role === "user") return [last];
  return [last];
}
