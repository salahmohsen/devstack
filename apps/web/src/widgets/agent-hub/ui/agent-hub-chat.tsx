import { type UIMessage } from "@ai-sdk/react";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from "@tsu-stack/ui/components/message-scroller";

import {
  useHubChat,
  useListHubMessagesQuery,
  useListSuspendedRunsQuery
} from "@/features/agent-hub";

import { AgentHubEmptyState } from "./agent-hub-empty-state";
import { AgentHubErrorCard } from "./agent-hub-error-card";
import { AgentHubMessageParts } from "./agent-hub-message-parts";
import { AgentHubMessageRow } from "./agent-hub-message-row";
import { AgentHubPromptComposer } from "./agent-hub-prompt-composer";
import { AgentHubToolApproval } from "./agent-hub-tool-approval";
import { AgentHubTypingIndicator } from "./agent-hub-typing-indicator";

type PendingApproval = {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};

function isUiMessageArray(value: unknown): value is UIMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) => m && typeof m === "object" && "role" in m && (m as { role: string }).role !== undefined
    )
  );
}

function findPendingApproval(messages: UIMessage[]): PendingApproval | null {
  for (const msg of [...messages].toReversed()) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts ?? []) {
      const p = part as {
        state?: string;
        approval?: { id: string };
        toolCallId?: string;
        type?: string;
        input?: unknown;
      };
      const isToolPart = p.type?.startsWith("tool-") === true || p.type === "dynamic-tool";
      if (isToolPart && p.state === "approval-requested" && p.approval?.id) {
        const toolName =
          p.type === "dynamic-tool" ? "tool" : (p.type ?? "tool").replace(/^tool-/, "");
        return {
          approvalId: p.approval.id,
          toolCallId: p.toolCallId ?? "",
          toolName,
          args: (p.input ?? {}) as Record<string, unknown>
        };
      }
    }
  }
  return null;
}

export function AgentHubChat() {
  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    stop,
    clearError,
    setMessages,
    addToolApprovalResponse
  } = useHubChat();

  const [input, setInput] = React.useState("");
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  const [approvalPending, setApprovalPending] = React.useState(false);
  const [dismissedResumeBanner, setDismissedResumeBanner] = React.useState(false);
  const [historyReady, setHistoryReady] = React.useState(false);
  const sendingRef = React.useRef(false);
  const hydrateStartedRef = React.useRef(false);

  const isStreaming = status === "submitted" || status === "streaming";
  const errorMessage = error?.message ?? null;
  const showError = Boolean(errorMessage) && errorMessage !== dismissedError;

  const historyQuery = useListHubMessagesQuery(!historyReady);
  const suspendedQuery = useListSuspendedRunsQuery(
    historyReady && messages.length === 0 && !isStreaming && !dismissedResumeBanner
  );

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

  React.useEffect(() => {
    if (!isStreaming) {
      sendingRef.current = false;
    }
  }, [isStreaming]);

  const pendingApproval = findPendingApproval(messages);
  // Clear stale approval spinner when no approval card is active.
  const approvalActionPending = approvalPending && pendingApproval != null;

  const sendText = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !historyReady || isStreaming || sendingRef.current || pendingApproval) {
        return;
      }
      sendingRef.current = true;
      setDismissedError(null);
      void sendMessage({ text: trimmed });
    },
    [historyReady, isStreaming, pendingApproval, sendMessage]
  );

  const handleSelectSuggestion = React.useCallback(
    (prompt: string) => {
      setInput("");
      sendText(prompt);
    },
    [sendText]
  );

  const handleSubmit = React.useCallback(() => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    sendText(text);
  }, [input, sendText]);

  const handleApprove = React.useCallback(() => {
    if (!pendingApproval || approvalActionPending) return;
    setApprovalPending(true);
    void Promise.resolve(
      addToolApprovalResponse({
        id: pendingApproval.approvalId,
        approved: true
      })
    ).finally(() => {
      setApprovalPending(false);
    });
  }, [addToolApprovalResponse, approvalActionPending, pendingApproval]);

  const handleDecline = React.useCallback(() => {
    if (!pendingApproval || approvalActionPending) return;
    setApprovalPending(true);
    void Promise.resolve(
      addToolApprovalResponse({
        id: pendingApproval.approvalId,
        approved: false
      })
    ).finally(() => {
      setApprovalPending(false);
    });
  }, [addToolApprovalResponse, approvalActionPending, pendingApproval]);

  const handleRetry = React.useCallback(() => {
    setDismissedError(null);
    clearError();
    if (messages.some((m) => m.role === "user")) {
      void regenerate();
    }
  }, [clearError, messages, regenerate]);

  const isEmpty = historyReady && messages.length === 0 && !isStreaming;
  const suspendedRuns = (Array.isArray(suspendedQuery.data) ? suspendedQuery.data : []) as Array<{
    runId: string;
    toolCalls: Array<{ toolName: string; toolCallId: string }>;
  }>;
  const showResumeBanner =
    isEmpty &&
    pendingApproval == null &&
    !dismissedResumeBanner &&
    suspendedRuns.length > 0 &&
    !suspendedQuery.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {showResumeBanner ? (
        <Alert variant="warning" className="shrink-0 rounded-none border-x-0 border-t-0">
          <AlertTitle>Pending tool approval</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              A previous hub run is waiting for approval
              {suspendedRuns[0]?.toolCalls[0]?.toolName
                ? ` (${suspendedRuns[0].toolCalls[0].toolName})`
                : ""}
              . If no approval card appears after history restore, the snapshot may be too old —
              start a new request or dismiss.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setDismissedResumeBanner(true)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!historyReady ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading conversation…
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AgentHubEmptyState onSelectSuggestion={handleSelectSuggestion} />
        </div>
      ) : (
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
                {messages.map((msg, index) => {
                  const role =
                    msg.role === "user" || msg.role === "assistant" || msg.role === "system"
                      ? msg.role
                      : "assistant";
                  const isLast = index === messages.length - 1;
                  const messageStreaming = isStreaming && isLast && role === "assistant";
                  return (
                    <MessageScrollerItem key={msg.id} messageId={msg.id}>
                      <AgentHubMessageRow role={role}>
                        <AgentHubMessageParts
                          parts={msg.parts ?? []}
                          role={role}
                          isStreaming={messageStreaming}
                        />
                      </AgentHubMessageRow>
                    </MessageScrollerItem>
                  );
                })}
                {isStreaming && pendingApproval == null ? (
                  <MessageScrollerItem messageId="__typing__">
                    <AgentHubTypingIndicator />
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="shrink-0 space-y-2 px-3 pt-2">
        {showError ? (
          <AgentHubErrorCard
            message={errorMessage ?? undefined}
            onRetry={handleRetry}
            onDismiss={() => {
              setDismissedError(errorMessage);
              clearError();
            }}
          />
        ) : null}
        {pendingApproval ? (
          <AgentHubToolApproval
            toolName={pendingApproval.toolName}
            args={pendingApproval.args}
            onApprove={handleApprove}
            onDecline={handleDecline}
            isPending={approvalActionPending || isStreaming}
          />
        ) : null}
      </div>

      <AgentHubPromptComposer
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        disabled={pendingApproval != null || !historyReady}
        isStreaming={isStreaming}
        onStop={() => void stop()}
      />
    </div>
  );
}
