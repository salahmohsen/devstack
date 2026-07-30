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
