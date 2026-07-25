import { useChat } from "@ai-sdk/react";

import {
  eventIteratorToUnproxiedDataStream,
  orpcClient
} from "@tsu-stack/api/client/tanstack-start/orpc";

const HUB_AGENT_ID = "hub-supervisor";

/**
 * `useChat` transport that proxies through the oRPC `agent.chatStream`
 * procedure. Matches the official oRPC + AI SDK integration:
 *
 *   return eventIteratorToUnproxiedDataStream(await client.chatStream(...))
 *
 * The server already parses Mastra's SSE into UIMessageChunk objects
 * before streaming them as an oRPC event iterator — do not re-decode
 * bytes with TextDecoder on the client (that throws when oRPC
 * rehydrates non-ArrayBuffer values).
 *
 * `reconnectToStream` is intentionally unsupported per the oRPC docs.
 */
export function useHubChat() {
  return useChat({
    transport: {
      async sendMessages(options) {
        // Cast: workspace can resolve two structural UIMessage types
        // (server `ai` vs client `@ai-sdk/react`). Runtime is identical.
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.agent.chatStream(
            {
              agentId: HUB_AGENT_ID,
              messages: options.messages as never
            },
            { signal: options.abortSignal }
          )
        ) as never;
      },
      reconnectToStream() {
        throw new Error("Stream reconnection is not supported.");
      }
    }
  });
}
