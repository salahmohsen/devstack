import { Chat, type useChat, type UIMessage } from "@ai-sdk/react";
import {
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls
} from "ai";
import { createContext, useContext } from "react";

import {
  eventIteratorToUnproxiedDataStream,
  orpcClient
} from "@tsu-stack/api/client/tanstack-start/orpc";

/** Must match `HUB_CHAT_AGENT_ID` on the API (hub-supervisor). */
export const HUB_AGENT_ID = "hub-supervisor";

const HUB_CHAT_ID = "hub-home";

export type HubToolApprovalResponseArgs = {
  id: string;
  approved: boolean;
  reason?: string;
};

export type HubToolOutputArgs = {
  tool: string;
  toolCallId: string;
  state?: "output-available" | "output-error";
  output?: unknown;
  errorText?: string;
};

type HubChatHelpers = ReturnType<typeof useChat>;

export type HubChatContextValue = Omit<HubChatHelpers, "addToolOutput"> & {
  chat: Chat<UIMessage>;
  historyReady: boolean;
  /**
   * Composite approval id from the tool part (`runId::toolCallId`).
   * Runtime: `Chat` extends `AbstractChat` which defines this method;
   * some `@ai-sdk/react` type versions omit it on the subclass.
   */
  addToolApprovalResponse: (args: HubToolApprovalResponseArgs) => void | PromiseLike<void>;
  /**
   * Client-tool output (e.g. propose-from-jd card). With
   * `lastAssistantMessageIsCompleteWithToolCalls` in sendAutomaticallyWhen,
   * this resumes the suspended stream.
   */
  addToolOutput: (args: HubToolOutputArgs) => void | PromiseLike<void>;
};

export const HubChatContext = createContext<HubChatContextValue | null>(null);

/**
 * Single hub Chat instance (id `hub-home`) with oRPC `agent.chatStream` transport.
 *
 * `sendAutomaticallyWhen` resumes after:
 * - `addToolApprovalResponse` (HITL requireToolApproval)
 * - `addToolOutput` (client tools)
 *
 * Transport proxies oRPC event iterators — do not re-decode SSE on the client.
 */
export function createHubChat(): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: HUB_CHAT_ID,
    sendAutomaticallyWhen: async (opts) =>
      lastAssistantMessageIsCompleteWithApprovalResponses(opts) ||
      lastAssistantMessageIsCompleteWithToolCalls(opts),
    transport: {
      async sendMessages(sendOptions) {
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.agent.chatStream(
            {
              agentId: HUB_AGENT_ID,
              messages: sendOptions.messages as never
            },
            { signal: sendOptions.abortSignal }
          )
        ) as never;
      },
      reconnectToStream() {
        throw new Error("Stream reconnection is not supported.");
      }
    }
  });
}

/**
 * Shared hub chat from `HubChatProvider`. Throws outside the dashboard layout.
 */
export function useHubChat(): HubChatContextValue {
  const context = useContext(HubChatContext);
  if (!context) {
    throw new Error("useHubChat must be used within HubChatProvider.");
  }
  return context;
}
