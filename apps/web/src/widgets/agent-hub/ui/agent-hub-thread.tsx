"use client";

import {
  AuiIf,
  SuggestionPrimitive,
  ThreadPrimitive,
  unstable_useThreadMessageIds
} from "@assistant-ui/react";
import { ArrowDownIcon, Sparkles } from "lucide-react";
import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { MessageScroller } from "@/shared/ui/agents/message-scroller";
import { DaySeparatorRule, DaySeparatorTime } from "@/shared/ui/assistant-ui/day-separator";
import {
  Composer,
  EditComposer,
  threadRootStyle,
  UserMessage
} from "@/shared/ui/assistant-ui/thread";

import {
  buildHubDayRows,
  HubAssistantMessage,
  lastHubHitlKind,
  useHubChat,
  type HubDayRow
} from "@/features/agent-hub";

import { useLoadOlderOnScrollTop } from "@/widgets/agent-hub/lib/use-load-older-on-scroll-top";

import { AgentHubErrorCard } from "./agent-hub-error-card";

const HUB_MESSAGE_COMPONENTS = {
  UserMessage,
  AssistantMessage: HubAssistantMessage,
  EditComposer
};

/**
 * React hooks stay on this component (outside Viewport children).
 * Viewport children must not mix TAP `useAuiState` with React `useState`.
 */
export function AgentHubThread() {
  const {
    messages,
    historyReady,
    hasMoreHistory,
    isLoadingOlder,
    loadOlderMessages,
    error,
    clearError,
    regenerate,
    status,
    ensureHistory
  } = useHubChat();

  React.useEffect(() => {
    ensureHistory();
  }, [ensureHistory]);
  const [viewportEl, setViewportEl] = React.useState<HTMLElement | null>(null);
  const [following, setFollowing] = React.useState(true);
  const { sentinelRef, loadError, retry } = useLoadOlderOnScrollTop({
    enabled: historyReady && messages.length > 0,
    hasMore: hasMoreHistory,
    isLoading: isLoadingOlder,
    loadOlder: loadOlderMessages,
    viewport: viewportEl,
    messageCount: messages.length
  });

  const isRunning = status === "submitted" || status === "streaming";
  const hitl = lastHubHitlKind(messages);
  const isEmpty = historyReady && messages.length === 0 && !isRunning;
  const dayById = React.useMemo(
    () => new Map(buildHubDayRows(messages).map((row) => [row.id, row])),
    [messages]
  );

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full min-h-0 flex-col bg-background"
      style={threadRootStyle}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="bottom"
        scrollToBottomOnInitialize={false}
        data-slot="aui_thread-viewport"
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <MessageScroller
          followOutput
          busy={isRunning}
          navigation={historyReady && !isEmpty ? "rail" : undefined}
          label="Hub conversation"
          viewportRef={setViewportEl}
          onFollowChange={setFollowing}
          className="min-h-0 flex-1"
          viewportClassName="px-4 pt-4"
          contentClassName={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-col",
            isEmpty && "min-h-full justify-center"
          )}
        >
          {!historyReady ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
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

          {historyReady && !isEmpty ? <HubDayMessages dayById={dayById} /> : null}
        </MessageScroller>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "aui-thread-viewport-footer relative shrink-0 bg-background px-4 pb-4 md:pb-6",
            !isEmpty && "rounded-t-(--composer-radius)"
          )}
        >
          {!following && !isEmpty ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="absolute inset-x-0 -top-12 z-10 mx-auto w-fit rounded-full"
              onClick={() => {
                setFollowing(true);
                viewportEl?.scrollTo({ top: viewportEl.scrollHeight, behavior: "smooth" });
              }}
            >
              <ArrowDownIcon className="size-4" strokeWidth={1.5} />
              <span className="sr-only">Scroll to latest</span>
            </Button>
          ) : null}
          <HubStreamErrorCard
            errorMessage={error?.message ?? null}
            hasUserMessage={messages.some((message) => message.role === "user")}
            onClearError={clearError}
            onRegenerate={() => {
              void regenerate();
            }}
          />
          <Composer
            attachments={false}
            disabled={!historyReady || hitl !== null}
            placeholder={
              hitl === "approval"
                ? "Waiting for approval…"
                : hitl === "client"
                  ? "Waiting for your choice…"
                  : isRunning
                    ? "Generating a response…"
                    : "Ask the hub anything…"
            }
          />
          <AuiIf
            condition={(s) =>
              historyReady &&
              s.thread.messages.length === 0 &&
              !s.thread.isRunning &&
              s.composer.isEmpty
            }
          >
            <HubSuggestions />
          </AuiIf>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function HubStreamErrorCard({
  errorMessage,
  hasUserMessage,
  onClearError,
  onRegenerate
}: {
  errorMessage: string | null;
  hasUserMessage: boolean;
  onClearError: () => void;
  onRegenerate: () => void;
}) {
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  const showError = Boolean(errorMessage) && errorMessage !== dismissedError;
  if (!showError) return null;

  return (
    <AgentHubErrorCard
      message={errorMessage ?? undefined}
      onRetry={() => {
        setDismissedError(null);
        onClearError();
        if (hasUserMessage) onRegenerate();
      }}
      onDismiss={() => {
        setDismissedError(errorMessage);
        onClearError();
      }}
    />
  );
}

/**
 * TAP-only: `unstable_useThreadMessageIds` must not share a component with
 * React `useState` (assistant-ui TAP compiler hook cache).
 */
function HubDayMessages({ dayById }: { dayById: Map<string, HubDayRow> }) {
  const ids = unstable_useThreadMessageIds();
  if (ids.length === 0) return null;

  return (
    <div data-slot="aui_message-group" className="mb-6 flex flex-col gap-y-6">
      {ids.map((id) => {
        const row = dayById.get(id);
        const from = row?.role === "user" ? "user" : "assistant";
        return (
          <div key={id} className="group relative flex flex-col gap-2">
            {row?.showDay && row.dayLabel ? <DaySeparatorRule label={row.dayLabel} /> : null}
            <div
              data-slot="message"
              data-from={from}
              className={cn("relative", from === "user" ? "ps-12" : "pe-12")}
            >
              {row?.timeLabel ? (
                <DaySeparatorTime
                  className={cn(
                    "pointer-events-none absolute top-3 z-10",
                    from === "user" ? "inset-s-0" : "inset-e-0"
                  )}
                >
                  {row.timeLabel}
                </DaySeparatorTime>
              ) : null}
              <div data-slot="message-content">
                <ThreadPrimitive.Unstable_MessageById
                  messageId={id}
                  components={HUB_MESSAGE_COMPONENTS}
                />
              </div>
            </div>
          </div>
        );
      })}
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
      <ThreadPrimitive.Suggestions>{() => <HubSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  );
}

function HubSuggestionItem() {
  return (
    <div className="aui-thread-welcome-suggestion-display animate-in duration-200 fill-mode-both fade-in slide-in-from-bottom-2">
      <SuggestionPrimitive.Trigger
        send
        render={
          <Button
            type="button"
            variant="ghost"
            className="aui-thread-welcome-suggestion h-auto gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-normal whitespace-nowrap text-foreground transition-colors hover:bg-muted"
          />
        }
      >
        <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
      </SuggestionPrimitive.Trigger>
    </div>
  );
}
