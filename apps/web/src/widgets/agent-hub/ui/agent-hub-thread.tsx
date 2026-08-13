"use client";

import { type UIMessage } from "@ai-sdk/react";
import {
  getExternalStoreMessages,
  ThreadPrimitive,
  unstable_useThreadMessageIds,
  useAuiState,
  useThreadViewport
} from "@assistant-ui/react";
import { Sparkles } from "lucide-react";
import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { DaySeparatorRule, DaySeparatorTime } from "@/shared/ui/assistant-ui/day-separator";
import {
  AssistantMessage,
  Composer,
  EditComposer,
  threadRootStyle,
  ThreadScrollToBottom,
  UserMessage
} from "@/shared/ui/assistant-ui/thread";

import {
  formatHubDayLabel,
  formatHubTimeLabel,
  HUB_SUGGESTIONS,
  messageCreatedAt,
  useHubChat
} from "@/features/agent-hub";

import { useLoadOlderOnScrollTop } from "@/widgets/agent-hub/lib/use-load-older-on-scroll-top";

import { AgentHubErrorCard } from "./agent-hub-error-card";

const HUB_MESSAGE_COMPONENTS = {
  UserMessage,
  AssistantMessage,
  EditComposer
};

function createdAtForHubThreadMessage(
  id: string,
  hubById: Map<string, UIMessage>,
  threadMessage: { metadata?: unknown; createdAt?: unknown } | undefined
): Date | null {
  const fromHub = hubById.get(id);
  if (fromHub) {
    const at = messageCreatedAt(fromHub);
    if (at) return at;
  }
  if (!threadMessage) return null;
  for (const original of getExternalStoreMessages(threadMessage as never)) {
    const at = messageCreatedAt(original as { metadata?: unknown; createdAt?: unknown });
    if (at) return at;
  }
  return messageCreatedAt(threadMessage);
}

type HubDayRow = {
  id: string;
  showDay: boolean;
  dayLabel: string | null;
  timeLabel: string | null;
  role: string;
};

function useHubDayRows(hubMessages: UIMessage[]): HubDayRow[] {
  const ids = unstable_useThreadMessageIds();
  const threadMessages = useAuiState((s) => s.thread.messages);

  return React.useMemo(() => {
    const hubById = new Map(hubMessages.map((message) => [message.id, message]));
    const now = new Date();
    const dayLabels = ids.map((id) => {
      const threadMessage = threadMessages.find((message) => message.id === id);
      const createdAt = createdAtForHubThreadMessage(id, hubById, threadMessage);
      return {
        id,
        createdAt,
        dayLabel: createdAt ? formatHubDayLabel(createdAt, now) : null,
        role: threadMessage?.role ?? "assistant"
      };
    });

    return dayLabels.map((row, index) => {
      const previousDay = dayLabels
        .slice(0, index)
        .toReversed()
        .find((previous) => previous.dayLabel != null)?.dayLabel;
      return {
        id: row.id,
        showDay: row.dayLabel != null && row.dayLabel !== previousDay,
        dayLabel: row.dayLabel,
        timeLabel: row.createdAt ? formatHubTimeLabel(row.createdAt) : null,
        role: row.role
      };
    });
  }, [hubMessages, ids, threadMessages]);
}

export function AgentHubThread() {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full min-h-0 flex-col bg-background"
      style={threadRootStyle}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="bottom"
        scrollToBottomOnInitialize
        data-slot="aui_thread-viewport"
        className="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <AgentHubThreadBody />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function AgentHubThreadBody() {
  const {
    messages,
    historyReady,
    hasMoreHistory,
    isLoadingOlder,
    loadOlderMessages,
    error,
    clearError,
    regenerate
  } = useHubChat();

  const viewport = useThreadViewport((s) => s.element.viewport);
  const threadMessageCount = useAuiState((s) => s.thread.messages.length);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const lastMessageStatus = useAuiState((s) => s.thread.messages.at(-1)?.status);
  const hitlPending = lastMessageStatus?.type === "requires-action";
  const waitingApproval =
    lastMessageStatus?.type === "requires-action" && lastMessageStatus.reason === "interrupt";
  const dayRows = useHubDayRows(messages);
  const { sentinelRef, loadError, retry } = useLoadOlderOnScrollTop({
    enabled: historyReady && threadMessageCount > 0,
    hasMore: hasMoreHistory,
    isLoading: isLoadingOlder,
    loadOlder: loadOlderMessages,
    viewport,
    messageCount: threadMessageCount
  });

  const [dismissedError, setDismissedError] = React.useState<string | null>(null);

  const errorMessage = error?.message ?? null;
  const showError = Boolean(errorMessage) && errorMessage !== dismissedError;
  const isEmpty = historyReady && threadMessageCount === 0 && !isRunning;
  const composerDisabled = !historyReady || hitlPending;

  const handleRetryError = React.useCallback(() => {
    setDismissedError(null);
    clearError();
    if (messages.some((message) => message.role === "user")) {
      void regenerate();
    }
  }, [clearError, messages, regenerate]);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4",
        isEmpty && "justify-center"
      )}
    >
      {!historyReady ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" aria-hidden />
          Loading conversation…
        </div>
      ) : null}

      {historyReady && !isEmpty ? (
        <HubLoadOlderHeader
          sentinelRef={sentinelRef}
          isLoading={isLoadingOlder}
          loadError={loadError}
          onRetry={retry}
        />
      ) : null}

      {isEmpty ? <HubWelcome /> : null}

      {historyReady && threadMessageCount > 0 ? (
        <div data-slot="aui_message-group" className="mb-14 flex flex-col gap-y-6">
          {dayRows.map((row) => (
            <div key={row.id} className="group relative flex flex-col gap-2">
              {row.showDay && row.dayLabel ? <DaySeparatorRule label={row.dayLabel} /> : null}
              <div className="relative">
                {row.timeLabel ? (
                  <DaySeparatorTime
                    className={cn(
                      "pointer-events-none absolute top-3 z-10",
                      row.role === "user" ? "inset-s-0" : "inset-e-0"
                    )}
                  >
                    {row.timeLabel}
                  </DaySeparatorTime>
                ) : null}
                <ThreadPrimitive.Unstable_MessageById
                  messageId={row.id}
                  components={HUB_MESSAGE_COMPONENTS}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ThreadPrimitive.ViewportFooter
        className={cn(
          "aui-thread-viewport-footer flex flex-col gap-4 overflow-visible bg-background pb-4 md:pb-6",
          !isEmpty && "sticky bottom-0 mt-auto rounded-t-(--composer-radius)"
        )}
      >
        <ThreadScrollToBottom />
        {showError ? (
          <AgentHubErrorCard
            message={errorMessage ?? undefined}
            onRetry={handleRetryError}
            onDismiss={() => {
              setDismissedError(errorMessage);
              clearError();
            }}
          />
        ) : null}
        <Composer
          attachments={false}
          disabled={composerDisabled}
          placeholder={
            waitingApproval
              ? "Waiting for approval…"
              : hitlPending
                ? "Waiting for your choice…"
                : isRunning
                  ? "Generating a response…"
                  : "Ask the hub anything…"
          }
        />
        {isEmpty ? <HubSuggestions /> : null}
      </ThreadPrimitive.ViewportFooter>
    </div>
  );
}

function HubLoadOlderHeader({
  sentinelRef,
  isLoading,
  loadError,
  onRetry
}: {
  sentinelRef: (node: HTMLElement | null) => void;
  isLoading: boolean;
  loadError: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 pb-3">
      <div ref={sentinelRef} data-slot="hub-load-older-sentinel" className="h-px w-full" />
      {isLoading ? (
        <output className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" aria-hidden />
          Loading older messages…
        </output>
      ) : null}
      {loadError ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-full"
          onClick={onRetry}
        >
          Couldn’t load older messages. Retry
        </Button>
      ) : null}
    </div>
  );
}

function HubWelcome() {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="size-4" aria-hidden />
      </div>
      <h1 className="aui-thread-welcome-message-inner animate-in text-2xl font-semibold duration-200 fill-mode-both fade-in slide-in-from-bottom-1">
        Welcome back. What can I do for you?
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ask about projects, detect stacks, organize your library, or plan the next move.
      </p>
    </div>
  );
}

function HubSuggestions() {
  return (
    <div
      className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-1"
      aria-label="Suggestions"
    >
      {HUB_SUGGESTIONS.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.id}
          prompt={suggestion.prompt}
          send
          className="aui-thread-welcome-suggestion h-auto rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-normal whitespace-nowrap text-foreground transition-colors hover:bg-muted"
        >
          {suggestion.label}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}
