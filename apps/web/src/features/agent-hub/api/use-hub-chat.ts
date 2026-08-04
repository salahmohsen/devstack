import { Chat, useChat, type UIMessage } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useMemo } from "react";

import {
  eventIteratorToUnproxiedDataStream,
  orpcClient
} from "@tsu-stack/api/client/tanstack-start/orpc";

/** Must match `HUB_CHAT_AGENT_ID` on the API (hub-supervisor). */
export const HUB_AGENT_ID = "hub-supervisor";

const HUB_CHAT_ID = "hub-home";

/**
 * Hub chat: AI SDK v6 `Chat` + `useChat({ chat })` so HITL can call
 * `chat.addToolApprovalResponse({ id, approved })` and re-send through the
 * same `chatStream` transport (Mastra v6 native approval).
 *
 * `sendAutomaticallyWhen` is required — without it, approve/decline only updates
 * local part state and never resumes the suspended Mastra run.
 *
 * Transport proxies oRPC event iterators — do not re-decode SSE on the client.
 */
export function useHubChat() {
  const chat = useMemo(
    () =>
      new Chat<UIMessage>({
        id: HUB_CHAT_ID,
        // After addToolApprovalResponse, re-submit messages so chatRoute sees
        // approval-responded and resumes the suspended run.
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
      }),
    []
  );

  const helpers = useChat({ chat });

  return {
    ...helpers,
    chat,
    /**
     * Composite approval id from the tool part (`runId::toolCallId`).
     * Runtime: `Chat` extends `AbstractChat` which defines this method;
     * some `@ai-sdk/react` type versions omit it on the subclass.
     */
    addToolApprovalResponse: (args: {
      id: string;
      approved: boolean;
      reason?: string;
    }): void | PromiseLike<void> => {
      const api = chat as unknown as {
        addToolApprovalResponse: (a: {
          id: string;
          approved: boolean;
          reason?: string;
        }) => void | PromiseLike<void>;
      };
      return api.addToolApprovalResponse(args);
    }
  };
}
