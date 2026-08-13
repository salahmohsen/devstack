import { Chat, type useChat, type UIMessage } from "@ai-sdk/react";
import { createContext, useContext } from "react";

import {
  eventIteratorToUnproxiedDataStream,
  orpcClient
} from "@tsu-stack/api/client/tanstack-start/orpc";

import { messagesForMastraMemoryChat } from "@/features/agent-hub/lib/messages-for-mastra-memory";
import { shouldAutoResumeHubChat } from "@/features/agent-hub/lib/should-auto-resume-hub-chat";

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
  hasMoreHistory: boolean;
  isLoadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;
  /**
   * Composite approval id from the tool part (`runId::toolCallId`).
   * Runtime: `Chat` extends `AbstractChat` which defines this method;
   * some `@ai-sdk/react` type versions omit it on the subclass.
   */
  addToolApprovalResponse: (args: HubToolApprovalResponseArgs) => void | PromiseLike<void>;
  /**
   * Client-tool output (e.g. propose-from-jd card). Hub auto-resume only for
   * known client HITL tools + approval — not bare
   * `lastAssistantMessageIsCompleteWithToolCalls` (that re-submits after every
   * server multi-step tool chain).
   */
  addToolOutput: (args: HubToolOutputArgs) => void | PromiseLike<void>;
};

export const HubChatContext = createContext<HubChatContextValue | null>(null);

/**
 * Single hub Chat instance (id `hub-home`) with oRPC `agent.chatStream` transport.
 *
 * `sendAutomaticallyWhen` resumes after:
 * - `addToolApprovalResponse` (HITL requireToolApproval)
 * - `addToolOutput` on **client** tools only (propose-from-jd)
 *
 * Do not use bare `lastAssistantMessageIsCompleteWithToolCalls`: after Mastra
 * finishes a server tool step (often without `providerExecuted`), that helper
 * is true and AI SDK re-POSTs with the assistant message id — answer vanishes
 * and regenerates in a loop.
 *
 * Transport proxies oRPC event iterators — do not re-decode SSE on the client.
 */
export function createHubChat(): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: HUB_CHAT_ID,
    sendAutomaticallyWhen: shouldAutoResumeHubChat,
    transport: {
      async sendMessages(sendOptions) {
        // Memory-backed hub: do NOT send full UI history (Mastra loads the thread).
        // Full history + memory = duplicate turns → multi-step rewrite thrash.
        const trigger = sendOptions.trigger ?? "submit-message";
        const messages = messagesForMastraMemoryChat(sendOptions.messages as UIMessage[], trigger);
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.agent.chatStream(
            {
              agentId: HUB_AGENT_ID,
              messages: messages as never,
              trigger
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
