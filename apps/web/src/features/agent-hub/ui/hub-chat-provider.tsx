import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { fetchHubMessagesPage } from "@/features/agent-hub/api/list-hub-messages.query";
import {
  createHubChat,
  HubChatContext,
  type HubChatContextValue,
  type HubToolApprovalResponseArgs,
  type HubToolOutputArgs
} from "@/features/agent-hub/api/use-hub-chat";
import {
  cancelOutputForHubHitl,
  staleWaitingHubConfirmCards,
  waitingHubConfirmCards
} from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  consumeHubCreateIntent,
  getHubCreateIntent,
  hubCreateInterviewText,
  subscribeHubCreateIntent
} from "@/features/agent-hub/lib/hub-assistant-open";
import { getHubComposerPersonality } from "@/features/agent-hub/lib/hub-composer-personality";
import {
  markHubHitlAbandonedOnRemount,
  markHubHitlRemountSeen
} from "@/features/agent-hub/lib/hub-hitl-remount";
import { rememberHubMessagePersonality } from "@/features/agent-hub/lib/hub-message-personality";
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
  const { setMessages, messages, sendMessage, status } = helpers;
  const pendingCreateKind = React.useSyncExternalStore(
    subscribeHubCreateIntent,
    getHubCreateIntent,
    getHubCreateIntent
  );

  const [historyReady, setHistoryReady] = React.useState(false);
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const nextHistoryPageRef = React.useRef(1);
  const loadingOlderRef = React.useRef(false);
  const historyLoadRef = React.useRef<Promise<void> | null>(null);
  const cancelledStaleIdsRef = React.useRef(new Set<string>());
  const remountCancelDoneRef = React.useRef(false);
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

  const ensureHistory = React.useCallback(() => {
    if (historyLoadRef.current) return;
    historyLoadRef.current = fetchHubMessagesPage(0)
      .then((page) => {
        const linear = hubHistoryHeadPath(mapUiMessagesToHistoryItems(page.uiMessages));
        markHubHitlRemountSeen();
        markHubHitlAbandonedOnRemount(
          waitingHubConfirmCards(linear.length > 0 ? linear : page.uiMessages).map(
            (card) => card.toolCallId
          )
        );
        importHistory(page.uiMessages, false);
        setHasMoreHistory(page.hasMore);
        nextHistoryPageRef.current = 1;
        setHistoryReady(true);
      })
      .catch(() => {
        setHistoryReady(true);
      });
  }, [importHistory]);

  // List `+` starts a spoken create interview. Clear kind only — never
  // consumeOpenHubAssistant (floater stays open via pendingOpen).
  React.useEffect(() => {
    if (!pendingCreateKind) return;
    ensureHistory();
    if (!historyReady) return;
    if (status === "submitted" || status === "streaming") return;
    const kind = consumeHubCreateIntent();
    if (!kind) return;
    void sendMessage({ text: hubCreateInterviewText(kind) });
  }, [ensureHistory, historyReady, pendingCreateKind, sendMessage, status]);

  React.useEffect(() => {
    if (status !== "submitted" && status !== "streaming") return;
    const last = messages.at(-1);
    if (!last || last.role !== "assistant") return;
    const personality = getHubComposerPersonality();
    rememberHubMessagePersonality(last.id, personality);
    const existing = (last.metadata as { hubPersonality?: unknown } | undefined)?.hubPersonality;
    if (existing === personality) return;
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== last.id) return message;
        return {
          ...message,
          metadata: {
            ...(message.metadata && typeof message.metadata === "object" ? message.metadata : {}),
            hubPersonality: personality
          }
        };
      })
    );
  }, [messages, setMessages, status]);

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

  const startNewChat = React.useCallback(async () => {
    // Cancel leftover HITL so composer is free on the new thread.
    for (const card of waitingHubConfirmCards(messagesRef.current)) {
      try {
        await Promise.resolve(
          addToolOutput({
            tool: card.toolName,
            toolCallId: card.toolCallId,
            output: cancelOutputForHubHitl(card.toolName)
          })
        );
      } catch {
        // Best-effort cancel; new epoch still proceeds.
      }
    }
    const result = await orpcClient.agent.startNewHubChat({});
    historyLoadRef.current = null;
    remountCancelDoneRef.current = false;
    cancelledStaleIdsRef.current.clear();
    allMessagesRef.current = [];
    setMessagesRef.current([]);
    setHasMoreHistory(false);
    nextHistoryPageRef.current = 1;
    setHistoryReady(false);
    // Re-hydrate empty history for the new epoch thread.
    historyLoadRef.current = fetchHubMessagesPage(0)
      .then((page) => {
        importHistory(page.uiMessages, true);
        setHasMoreHistory(page.hasMore);
        nextHistoryPageRef.current = 1;
        setHistoryReady(true);
      })
      .catch(() => {
        setHistoryReady(true);
      });
    await historyLoadRef.current;
    return { epoch: result.epoch, threadId: result.threadId };
  }, [addToolOutput, importHistory]);

  React.useEffect(() => {
    if (!historyReady || remountCancelDoneRef.current) return;
    remountCancelDoneRef.current = true;
    const waiting = waitingHubConfirmCards(messages);
    markHubHitlAbandonedOnRemount(waiting.map((card) => card.toolCallId));
    for (const card of waiting) {
      cancelledStaleIdsRef.current.add(card.toolCallId);
      void Promise.resolve(
        addToolOutput({
          tool: card.toolName,
          toolCallId: card.toolCallId,
          output: cancelOutputForHubHitl(card.toolName)
        })
      ).catch(() => {
        cancelledStaleIdsRef.current.delete(card.toolCallId);
      });
    }
  }, [addToolOutput, historyReady, messages]);

  React.useEffect(() => {
    if (!historyReady || messages.length === 0) return;
    const stale = staleWaitingHubConfirmCards(messages);
    for (const card of stale) {
      if (cancelledStaleIdsRef.current.has(card.toolCallId)) continue;
      cancelledStaleIdsRef.current.add(card.toolCallId);
      void Promise.resolve(
        addToolOutput({
          tool: card.toolName,
          toolCallId: card.toolCallId,
          output: cancelOutputForHubHitl(card.toolName)
        })
      ).catch(() => {
        cancelledStaleIdsRef.current.delete(card.toolCallId);
      });
    }
  }, [addToolOutput, historyReady, messages]);

  const value: HubChatContextValue = {
    ...helpers,
    chat,
    historyReady,
    hasMoreHistory,
    isLoadingOlder,
    loadOlderMessages,
    ensureHistory,
    startNewChat,
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
