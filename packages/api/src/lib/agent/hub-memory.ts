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
 * Multi-step bound for hub chat.
 * 1 = single LLM turn (tools + text in that turn only). Higher values let the
 * model rewrite the same answer on later steps (the "bubble keeps changing" UX).
 * Sequential multi-tool chains need a follow-up product path, not maxSteps churn.
 */
export const HUB_CHAT_MAX_STEPS = 1 as const;

export function hubChatThreadId(userId: string): string {
  return `dashboard-home:${userId}`;
}

/** Body fragment for `/chat/:agentId` and `/agents/:id/generate`. */
export function hubChatMemoryOptions(userId: string): {
  memory: { thread: string; resource: string };
} {
  return {
    memory: {
      thread: hubChatThreadId(userId),
      resource: userId
    }
  };
}

export function isChatAllowedAgentId(agentId: string): agentId is ChatAllowedAgentId {
  return (CHAT_ALLOWED_AGENT_IDS as readonly string[]).includes(agentId);
}
