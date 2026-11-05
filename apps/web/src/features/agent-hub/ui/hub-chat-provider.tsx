import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { dismissDashboardSidePanel } from "@/shared/lib/side-panel-control";

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
  sealHubApprovalCards,
  sealWaitingHubHitlOnRemount,
  staleWaitingHubConfirmCards,
  waitingHubApprovalCards,
  waitingHubConfirmCards
} from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  classifyHubHistoryError,
  type HubHistoryErrorKind
} from "@/features/agent-hub/lib/classify-hub-history-error";
import {
  findHubApprovalId,
  withApprovalRequested
} from "@/features/agent-hub/lib/hub-approval-resume";
import {
  consumeHubApplicationPlantNewChat,
  consumeHubCreateIntent,
  consumeHubInterviewRehearsal,
  getHubApplicationPlant,
  getHubCreateIntent,
  getHubInterviewRehearsal,
  hubCreateInterviewText,
  subscribeHubApplicationPlant,
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
import { stopHubChatAndWaitIdle } from "@/features/agent-hub/lib/stop-hub-chat-and-wait-idle";
import {
  hubToolCallIsOnLastMessage,
  writeHubToolOutputs
} from "@/features/agent-hub/lib/write-hub-tool-output";

import { hubAssistantAuiConfig } from "./hub-assistant-toolkit";

/** Silent retries while the agent/API is briefly down — never fake an empty welcome mid-retry. */
const HISTORY_RETRY_DELAYS_MS = [500, 1000, 2000, 4000] as const;

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
  const pendingInterview = React.useSyncExternalStore(
    subscribeHubCreateIntent,
    getHubInterviewRehearsal,
    getHubInterviewRehearsal
  );
  const pendingPlant = React.useSyncExternalStore(
    subscribeHubApplicationPlant,
    getHubApplicationPlant,
    getHubApplicationPlant
  );
  const startingPlantChatRef = React.useRef(false);

  const [historyReady, setHistoryReady] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<HubHistoryErrorKind | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const nextHistoryPageRef = React.useRef(1);
  const loadingOlderRef = React.useRef(false);
  const historyLoadRef = React.useRef<Promise<void> | null>(null);
  const historyRetryAttemptRef = React.useRef(0);
  const historyRetryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const base = linear.length > 0 ? linear : uiMessages;
    // Seal waiting HITL before first paint — post-paint remount cancel races
    // live GenUI cards (preview/take queries) and can lock Chrome's main thread.
    const sealed = sealWaitingHubHitlOnRemount(base);
    if (sealed.cancelledIds.length > 0) {
      markHubHitlAbandonedOnRemount(sealed.cancelledIds);
      for (const id of sealed.cancelledIds) {
        cancelledStaleIdsRef.current.add(id);
      }
      remountCancelDoneRef.current = true;
    }
    setMessagesRef.current(sealed.messages as typeof messages);
  }, []);

  const ensureHistory = React.useCallback((): Promise<void> => {
    if (historyLoadRef.current) return historyLoadRef.current;
    const loadPromise = (async () => {
      let attempt = 0;
      for (;;) {
        try {
          const page = await fetchHubMessagesPage(0);
          historyRetryAttemptRef.current = 0;
          setHistoryError(null);
          markHubHitlRemountSeen();
          // Initial hydrate must replace — a stale empty Chat path must not block import.
          importHistory(page.uiMessages, true);
          setHasMoreHistory(page.hasMore);
          nextHistoryPageRef.current = 1;
          setHistoryReady(true);
          // Heal the assistant-ui tap hydration race: when the initial
          // setMessages lands while the runtime's reactive subscriptions are
          // still mounting (fresh tab load, SPA remount), the runtime thread
          // commits but the reactive emit to React is lost — the thread scope
          // then never re-emits (later notifies compare equal) and the
          // conversation renders empty forever. One identity-only bump after
          // mount forces the reactive chain to flush; a no-op when the thread
          // is genuinely empty.
          window.setTimeout(() => {
            setMessagesRef.current((prev) => (prev.length > 0 ? [...prev] : prev));
          }, 50);
          return;
        } catch (error) {
          // Keep historyReady false so HubWelcome never paints over a real
          // thread and the composer stays locked while the load is failing.
          const kind = classifyHubHistoryError(error);
          if (kind === "auth" || attempt >= HISTORY_RETRY_DELAYS_MS.length) {
            historyLoadRef.current = null;
            setHistoryError(kind);
            return;
          }
          const delay = HISTORY_RETRY_DELAYS_MS[attempt] ?? 4000;
          attempt += 1;
          historyRetryAttemptRef.current = attempt;
          await new Promise<void>((resolve) => {
            historyRetryTimerRef.current = setTimeout(() => {
              historyRetryTimerRef.current = null;
              resolve();
            }, delay);
          });
        }
      }
    })();
    historyLoadRef.current = loadPromise;
    return loadPromise;
  }, [importHistory]);

  React.useEffect(
    () => () => {
      if (historyRetryTimerRef.current != null) {
        clearTimeout(historyRetryTimerRef.current);
        historyRetryTimerRef.current = null;
      }
    },
    []
  );

  // Tab focus: if we painted empty after a failed hydrate, try again once the
  // agent may be back. Genuine empty threads just re-confirm empty.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (messagesRef.current.length > 0) return;
      if (historyRetryTimerRef.current != null) return;
      historyLoadRef.current = null;
      historyRetryAttemptRef.current = 0;
      setHistoryError(null);
      setHistoryReady(false);
      void ensureHistory();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ensureHistory]);

  // List `+` starts a spoken create interview. Clear kind only — never
  // consumeOpenHubAssistant (floater stays open via pendingOpen).
  React.useEffect(() => {
    if (!pendingCreateKind) return;
    void ensureHistory();
    if (!historyReady) return;
    if (status === "submitted" || status === "streaming") return;
    const kind = consumeHubCreateIntent();
    if (!kind) return;
    void sendMessage({ text: hubCreateInterviewText(kind) });
  }, [ensureHistory, historyReady, pendingCreateKind, sendMessage, status]);

  React.useEffect(() => {
    if (!pendingInterview) return;
    void ensureHistory();
    if (!historyReady) return;
    if (status === "submitted" || status === "streaming") return;
    const text = consumeHubInterviewRehearsal();
    if (!text) return;
    void sendMessage({ text });
  }, [ensureHistory, historyReady, pendingInterview, sendMessage, status]);

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
      // Chat.addToolOutput rewrites only the last message; older cards would be
      // dropped silently, so write those into state directly (no auto-resume).
      if (!hubToolCallIsOnLastMessage(chat.messages, args.toolCallId)) {
        const written = writeHubToolOutputs(chat.messages, [args]);
        if (written.changedIds.length > 0) {
          setMessagesRef.current(written.messages as typeof messages);
        }
        return;
      }
      return api.addToolOutput(args);
    },
    [chat]
  );

  const clearPendingHitl = React.useCallback(() => {
    for (const card of waitingHubConfirmCards(chat.messages)) {
      void addToolOutput({
        tool: card.toolName,
        toolCallId: card.toolCallId,
        output: cancelOutputForHubHitl(card.toolName)
      });
    }
    for (const card of waitingHubApprovalCards(chat.messages)) {
      const approvalId = findHubApprovalId(chat.messages, card.toolCallId);
      // The SDK only answers approvals on the last message; anything else, or an
      // approval whose id is gone, is denied locally with no resume.
      if (approvalId && chat.messages.at(-1)?.id === card.messageId) {
        setMessagesRef.current(
          withApprovalRequested(chat.messages, card.toolCallId, approvalId) as typeof messages
        );
        void chat.addToolApprovalResponse({
          id: approvalId,
          approved: false,
          reason: "cancelled"
        });
      } else {
        setMessagesRef.current(
          sealHubApprovalCards(chat.messages, [card]).messages as typeof messages
        );
      }
    }
  }, [addToolOutput, chat]);

  const retryHistory = React.useCallback(() => {
    if (historyRetryTimerRef.current != null) {
      clearTimeout(historyRetryTimerRef.current);
      historyRetryTimerRef.current = null;
    }
    historyLoadRef.current = null;
    historyRetryAttemptRef.current = 0;
    setHistoryError(null);
    void ensureHistory();
  }, [ensureHistory]);

  const startNewChat = React.useCallback(async () => {
    // Abort first: a live stream would otherwise repaint the old reply into the
    // new thread, and a cancel below could auto-resume against the old epoch.
    await stopHubChatAndWaitIdle(chat);
    // Sealed locally (not addToolOutput) so cancelling cannot trigger a resume.
    const sealed = sealWaitingHubHitlOnRemount(messagesRef.current);
    if (sealed.cancelledIds.length > 0) {
      setMessagesRef.current(sealed.messages as typeof messages);
    }
    // Drop inspect / Today / form panels from the previous thread.
    dismissDashboardSidePanel({ force: true });
    const result = await orpcClient.agent.startNewHubChat({});
    if (historyRetryTimerRef.current != null) {
      clearTimeout(historyRetryTimerRef.current);
      historyRetryTimerRef.current = null;
    }
    historyLoadRef.current = null;
    historyRetryAttemptRef.current = 0;
    remountCancelDoneRef.current = false;
    cancelledStaleIdsRef.current.clear();
    allMessagesRef.current = [];
    setMessagesRef.current([]);
    setHasMoreHistory(false);
    nextHistoryPageRef.current = 1;
    setHistoryError(null);
    setHistoryReady(false);
    // Re-hydrate empty history for the new epoch thread (retry on transient fail).
    await ensureHistory();
    return { epoch: result.epoch, threadId: result.threadId };
  }, [chat, ensureHistory]);

  // Open in agent: fresh thread, then plant (composer-side). Never send.
  React.useEffect(() => {
    if (!pendingPlant?.needsNewChat) return;
    if (startingPlantChatRef.current) return;
    startingPlantChatRef.current = true;
    void startNewChat().finally(() => {
      consumeHubApplicationPlantNewChat();
      startingPlantChatRef.current = false;
    });
  }, [pendingPlant, startNewChat]);

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
    const stale = staleWaitingHubConfirmCards(messages).filter(
      (card) => !cancelledStaleIdsRef.current.has(card.toolCallId)
    );
    if (stale.length === 0) return;
    // Cards on older messages cannot go through Chat.addToolOutput (last message
    // only), so the cancellation is written into state and recorded only if it took.
    const writes = stale.map((card) => {
      return { toolCallId: card.toolCallId, output: cancelOutputForHubHitl(card.toolName) };
    });
    const written = writeHubToolOutputs(messages, writes);
    for (const id of written.changedIds) cancelledStaleIdsRef.current.add(id);
    if (written.changedIds.length > 0) {
      setMessages((prev) => writeHubToolOutputs(prev, writes).messages as typeof messages);
    }
  }, [historyReady, messages, setMessages]);

  const value: HubChatContextValue = {
    ...helpers,
    chat,
    historyReady,
    historyError,
    retryHistory,
    clearPendingHitl,
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
