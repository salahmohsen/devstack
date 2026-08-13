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
  hubHistoryHeadPath,
  mapUiMessagesToHistoryItems,
  prependUniqueHubMessages,
  unionHubMessages
} from "@/features/agent-hub/lib/hub-thread-history-adapter";

import { hubAssistantAuiConfig } from "./hub-assistant-toolkit";

/**
 * Owns the single dashboard hub `Chat` instance and hydrates Mastra memory once.
 * Mount on the dashboard layout so Hub home and job surfaces share the same thread.
 */
export function HubChatProvider({ children }: { children: React.ReactNode }) {
  const chat = React.useMemo(() => createHubChat(), []);
  const helpers = useChat({ chat });
  const { setMessages, messages } = helpers;

  const [historyReady, setHistoryReady] = React.useState(false);
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const nextHistoryPageRef = React.useRef(1);
  const loadingOlderRef = React.useRef(false);
  const allMessagesRef = React.useRef<typeof messages>([]);
  const setMessagesRef = React.useRef(setMessages);
  const messagesRef = React.useRef(messages);

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
    setMessagesRef.current = setMessages;
    messagesRef.current = messages;
  }, [messages, setMessages]);

  const importHistory = React.useCallback((uiMessages: typeof messages, replacePath: boolean) => {
    allMessagesRef.current = uiMessages;
    if (uiMessages.length === 0) return;
    if (!replacePath && messagesRef.current.length > 0) return;
    // Official AI SDK hydrate: setMessages only (useExternalHistory.load is
    // gated on Cloud remoteId). joinStrategy concat-content merges consecutive
    // assistants, so persist the latest sibling path — durable history is linear.
    const linear = hubHistoryHeadPath(mapUiMessagesToHistoryItems(uiMessages));
    setMessagesRef.current(linear.length > 0 ? linear : uiMessages);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void fetchHubMessagesPage(0)
      .then((page) => {
        if (cancelled) return;
        importHistory(page.uiMessages, false);
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
  }, [importHistory]);

  const loadOlderMessages = React.useCallback(async () => {
    if (!historyReady || !hasMoreHistory || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const page = nextHistoryPageRef.current;
      const data = await fetchHubMessagesPage(page);
      const merged = prependUniqueHubMessages(
        data.uiMessages,
        unionHubMessages(allMessagesRef.current, messagesRef.current)
      );
      importHistory(merged, true);
      nextHistoryPageRef.current = page + 1;
      setHasMoreHistory(data.hasMore);
    } catch {
      // Preserve prior behavior: bubble failures to the caller after cleanup.
    }
    loadingOlderRef.current = false;
    setIsLoadingOlder(false);
  }, [hasMoreHistory, historyReady, importHistory]);

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
      config={hubAssistantAuiConfig}
    >
      <HubChatContext value={value}>{children}</HubChatContext>
    </AssistantRuntimeProvider>
  );
}
