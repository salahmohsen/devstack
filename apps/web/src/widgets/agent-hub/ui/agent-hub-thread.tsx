"use client";

import {
  SuggestionPrimitive,
  ThreadPrimitive,
  unstable_useThreadMessageIds
} from "@assistant-ui/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon } from "lucide-react";
import * as React from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  hubPersonalityAvatarSeed,
  hubPersonalityById,
  userTurnAsksDailyBrief
} from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { MessageScroller } from "@/shared/ui/agents/message-scroller";
import { DaySeparatorRule, DaySeparatorTime } from "@/shared/ui/assistant-ui/day-separator";
import { EditComposer, threadRootStyle } from "@/shared/ui/assistant-ui/thread";

import {
  buildHubDayRows,
  getHubComposerPersonality,
  HubAssistantMessage,
  HubFollowupSuggestions,
  HubUserMessage,
  lastHubHitlKind,
  subscribeHubComposerPersonality,
  useHubChat,
  clearDailyBriefRequest,
  type HubDayRow
} from "@/features/agent-hub";

import { useLoadOlderOnScrollTop } from "@/widgets/agent-hub/lib/use-load-older-on-scroll-top";
import { HubElementsComposer } from "@/widgets/agent-hub/ui/hub-elements-composer";

import { AgentHubErrorCard } from "./agent-hub-error-card";

const HUB_MESSAGE_COMPONENTS = {
  UserMessage: HubUserMessage,
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

  const clearedTodayAskRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    let latestUserId = "";
    let latestUser = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i] as {
        id?: string;
        role?: string;
        parts?: readonly { type?: string; text?: string }[];
      };
      if (message?.role !== "user") continue;
      latestUserId = message.id ?? `idx:${i}`;
      latestUser = (message.parts ?? [])
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();
      break;
    }
    if (!latestUserId || !userTurnAsksDailyBrief(latestUser)) return;
    if (clearedTodayAskRef.current === latestUserId) return;
    clearedTodayAskRef.current = latestUserId;
    clearDailyBriefRequest();
  }, [messages]);
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
          viewportClassName="px-5 pt-4"
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
            "aui-thread-viewport-footer relative shrink-0 bg-background px-5 pb-4 md:pb-6",
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
          <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-col">
            <HubStreamErrorCard
              errorMessage={error?.message ?? null}
              lastMessageRole={messages.at(-1)?.role}
              hasUserMessage={messages.some((message) => message.role === "user")}
              onClearError={clearError}
              onRegenerate={() => {
                void regenerate();
              }}
            />
            <HubFollowupSuggestions />
            <HubElementsComposer
              disabled={!historyReady || hitl === "approval"}
              placeholder={
                hitl === "approval"
                  ? "Waiting for approval…"
                  : isRunning
                    ? "Generating a response…"
                    : "Ask the hub anything…"
              }
            />
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function HubStreamErrorCard({
  errorMessage,
  lastMessageRole,
  hasUserMessage,
  onClearError,
  onRegenerate
}: {
  errorMessage: string | null;
  lastMessageRole?: string;
  hasUserMessage: boolean;
  onClearError: () => void;
  onRegenerate: () => void;
}) {
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  // In-thread banner owns recovery when the last turn is an assistant bubble.
  if (lastMessageRole === "assistant") return null;
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
    <div data-slot="aui_message-group" className="mb-10 flex flex-col gap-y-6">
      {ids.map((id) => {
        const row = dayById.get(id);
        const from = row?.role === "user" ? "user" : "assistant";
        return (
          <div
            key={id}
            className={cn(
              "group relative flex flex-col",
              row?.showDay ? "gap-3 pt-2 first:pt-0" : "gap-1.5"
            )}
          >
            {row?.showDay && row.dayLabel ? <DaySeparatorRule label={row.dayLabel} /> : null}
            <div data-slot="message" data-from={from} className="relative">
              {row?.timeLabel ? (
                <DaySeparatorTime
                  className={cn(
                    "pointer-events-none absolute top-1.5 z-10",
                    from === "user" ? "inset-e-full pe-2" : "inset-s-full ps-2"
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
  const settings = useQuery(
    orpcQueryClient.aiSettings.get.queryOptions({
      staleTime: 60_000,
      refetchOnWindowFocus: false
    })
  );
  const sessionPersonality = React.useSyncExternalStore(
    subscribeHubComposerPersonality,
    getHubComposerPersonality,
    getHubComposerPersonality
  );
  const personality = hubPersonalityById(sessionPersonality ?? settings.data?.hubPersonality);
  const seed = hubPersonalityAvatarSeed(personality.id);

  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <div className="mb-3 size-10 overflow-hidden rounded-full bg-muted">
        <AgentAvatar seed={seed} size={40} animated className="size-10" aria-hidden />
      </div>
      <h1 className="aui-thread-welcome-message-inner animate-in text-2xl font-semibold duration-200 fill-mode-both fade-in slide-in-from-bottom-1">
        Welcome back. What can I do for you?
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Today's jobs, mail, or what you're looking for.
      </p>
      <HubSuggestions />
    </div>
  );
}

function HubSuggestions() {
  return (
    <div
      className="aui-thread-welcome-suggestions mt-8 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2"
      aria-label="Suggestions"
    >
      <ThreadPrimitive.Suggestions>{() => <HubSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  );
}

function HubSuggestionItem() {
  return (
    <div className="aui-thread-welcome-suggestion-display min-w-0">
      <SuggestionPrimitive.Trigger
        send
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "aui-thread-welcome-suggestion h-9 w-full justify-center rounded-full border border-border/50 bg-muted/35 px-3 text-[13px] font-normal text-foreground/85",
              "transition-[color,background-color,transform,border-color] duration-150 ease-out",
              "hover:border-border hover:bg-muted hover:text-foreground",
              "active:scale-[0.96]",
              "motion-reduce:transition-none active:motion-reduce:scale-100"
            )}
          />
        }
      >
        <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 truncate" />
      </SuggestionPrimitive.Trigger>
    </div>
  );
}
