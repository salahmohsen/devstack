import { useChat, type UIMessage } from "@ai-sdk/react";
import * as React from "react";

import { useListHubMessagesQuery } from "@/features/agent-hub/api/list-hub-messages.query";
import {
  createHubChat,
  HubChatContext,
  type HubChatContextValue,
  type HubToolApprovalResponseArgs,
  type HubToolOutputArgs
} from "@/features/agent-hub/api/use-hub-chat";

function isUiMessageArray(value: unknown): value is UIMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) => m && typeof m === "object" && "role" in m && (m as { role: string }).role !== undefined
    )
  );
}

/**
 * Owns the single dashboard hub `Chat` instance and hydrates Mastra memory once.
 * Mount on the dashboard layout so Hub home and Applications share the same thread.
 */
export function HubChatProvider({ children }: { children: React.ReactNode }) {
  const chat = React.useMemo(() => createHubChat(), []);
  const helpers = useChat({ chat });
  const { setMessages, messages } = helpers;

  const [historyReady, setHistoryReady] = React.useState(false);
  const hydrateStartedRef = React.useRef(false);

  const historyQuery = useListHubMessagesQuery(!historyReady);

  // Hydrate from Memory once history settles (async setState avoids sync-effect lint).
  React.useEffect(() => {
    if (historyReady || historyQuery.isLoading || hydrateStartedRef.current) return;
    hydrateStartedRef.current = true;

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (historyQuery.isError) {
        setHistoryReady(true);
        return;
      }
      const data = historyQuery.data as
        | { uiMessages?: unknown[] | null; messages?: unknown[] }
        | undefined;
      const ui = data?.uiMessages;
      if (isUiMessageArray(ui) && ui.length > 0 && messages.length === 0) {
        setMessages(ui);
      }
      setHistoryReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    historyQuery.data,
    historyQuery.isError,
    historyQuery.isLoading,
    historyReady,
    messages.length,
    setMessages
  ]);

  const addToolApprovalResponse = React.useCallback(
    (args: HubToolApprovalResponseArgs): void | PromiseLike<void> => {
      const api = chat as unknown as {
        addToolApprovalResponse: (a: HubToolApprovalResponseArgs) => void | PromiseLike<void>;
      };
      return api.addToolApprovalResponse(args);
    },
    [chat]
  );

  const addToolOutput = React.useCallback(
    (args: HubToolOutputArgs): void | PromiseLike<void> => {
      const api = chat as unknown as {
        addToolOutput: (a: HubToolOutputArgs) => void | PromiseLike<void>;
      };
      return api.addToolOutput(args);
    },
    [chat]
  );

  const value: HubChatContextValue = {
    ...helpers,
    chat,
    historyReady,
    addToolApprovalResponse,
    addToolOutput
  };

  return <HubChatContext value={value}>{children}</HubChatContext>;
}
