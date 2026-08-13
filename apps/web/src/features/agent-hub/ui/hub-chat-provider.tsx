import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import * as React from "react";

import { fetchHubMessagesPage } from "@/features/agent-hub/api/list-hub-messages.query";
import {
  createHubChat,
  HubChatContext,
  type HubChatContextValue,
  type HubToolApprovalResponseArgs,
  type HubToolOutputArgs
} from "@/features/agent-hub/api/use-hub-chat";
import {
  createHubThreadHistoryAdapter,
  prependUniqueHubMessages
} from "@/features/agent-hub/lib/hub-thread-history-adapter";

/**
 * Owns the single dashboard hub `Chat` instance and hydrates Mastra memory once.
 * Mount on the dashboard layout so Hub home and job surfaces share the same thread.
 */
export function HubChatProvider({ children }: { children: React.ReactNode }) {
  const chat = React.useMemo(() => createHubChat(), []);
  const helpers = useChat({ chat });
  const { setMessages } = helpers;

  const [historyReady, setHistoryReady] = React.useState(false);
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const nextHistoryPageRef = React.useRef(1);
  const hydrateStartedRef = React.useRef(false);
  const loadingOlderRef = React.useRef(false);

  const history = React.useMemo(
    () => createHubThreadHistoryAdapter({ loadPage: fetchHubMessagesPage }),
    []
  );

  // 1.3 `useExternalHistory` only invokes `history.withFormat().load()` when a
  // Cloud `threadListItem.remoteId` exists. Without Cloud we inject page 0
  // once via `setMessages` — never dual-load with the adapter.
  //
  // Casts: `@assistant-ui/react-ai-sdk@1.3` types against nested `@ai-sdk/react@3`
  // + `@assistant-ui/core@0.2`; the app uses catalog `@ai-sdk/react@2` and
  // `@assistant-ui/react` (core 0.3). Runtime shapes match.
  const runtime = useAISDKRuntime(helpers as unknown as Parameters<typeof useAISDKRuntime>[0], {
    joinStrategy: "concat-content",
    adapters: { history }
  });

  React.useEffect(() => {
    if (hydrateStartedRef.current) return;
    hydrateStartedRef.current = true;

    let cancelled = false;
    void fetchHubMessagesPage(0)
      .then((page) => {
        if (cancelled) return;
        if (page.uiMessages.length > 0) {
          setMessages((current) => (current.length === 0 ? page.uiMessages : current));
        }
        setHasMoreHistory(page.hasMore);
        nextHistoryPageRef.current = 1;
        setHistoryReady(true);
      })
      .catch(() => {
        if (!cancelled) setHistoryReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  const loadOlderMessages = React.useCallback(async () => {
    if (!historyReady || !hasMoreHistory || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const page = nextHistoryPageRef.current;
      const data = await fetchHubMessagesPage(page);
      setMessages((current) => prependUniqueHubMessages(data.uiMessages, current));
      nextHistoryPageRef.current = page + 1;
      setHasMoreHistory(data.hasMore);
    } catch {
      // Fail soft: keep the current transcript. Task 4 owns retry chrome.
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [hasMoreHistory, historyReady, setMessages]);

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
    hasMoreHistory,
    isLoadingOlder,
    loadOlderMessages,
    addToolApprovalResponse,
    addToolOutput
  };

  return (
    <AssistantRuntimeProvider
      runtime={
        runtime as unknown as React.ComponentProps<typeof AssistantRuntimeProvider>["runtime"]
      }
    >
      <HubChatContext value={value}>{children}</HubChatContext>
    </AssistantRuntimeProvider>
  );
}
