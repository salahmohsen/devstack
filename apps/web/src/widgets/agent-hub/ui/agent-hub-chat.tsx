import * as React from "react";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from "@tsu-stack/ui/components/message-scroller";

import { useApproveToolCall, useHubChat } from "@/features/agent-hub";

import { AgentHubEmptyState } from "./agent-hub-empty-state";
import { AgentHubErrorCard } from "./agent-hub-error-card";
import { AgentHubMessageParts } from "./agent-hub-message-parts";
import { AgentHubMessageRow } from "./agent-hub-message-row";
import { AgentHubPromptComposer } from "./agent-hub-prompt-composer";
import { AgentHubToolApproval } from "./agent-hub-tool-approval";
import { AgentHubTypingIndicator } from "./agent-hub-typing-indicator";

export function AgentHubChat() {
  const { messages, sendMessage, regenerate, status, error, stop, clearError } = useHubChat();
  const approveToolCall = useApproveToolCall();

  const [input, setInput] = React.useState("");
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  const sendingRef = React.useRef(false);

  const isStreaming = status === "submitted" || status === "streaming";
  const errorMessage = error?.message ?? null;
  const showError = !!errorMessage && errorMessage !== dismissedError;

  React.useEffect(() => {
    if (!isStreaming) {
      sendingRef.current = false;
    }
  }, [isStreaming]);

  const pendingApproval = React.useMemo(() => {
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
        if (p.type?.startsWith("tool-") && p.state === "approval-requested" && p.approval) {
          return {
            approvalId: p.approval.id,
            toolCallId: p.toolCallId ?? "",
            toolName: p.type.replace("tool-", ""),
            args: (p.input ?? {}) as Record<string, unknown>
          };
        }
      }
    }
    return null;
  }, [messages]);

  const sendText = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || sendingRef.current || pendingApproval) return;
      sendingRef.current = true;
      setDismissedError(null);
      void sendMessage({ text: trimmed });
    },
    [isStreaming, pendingApproval, sendMessage]
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
    if (!pendingApproval) return;
    approveToolCall.mutate({
      runId: "current",
      toolCallId: pendingApproval.toolCallId,
      approved: true
    });
  }, [approveToolCall, pendingApproval]);

  const handleDecline = React.useCallback(() => {
    if (!pendingApproval) return;
    approveToolCall.mutate({
      runId: "current",
      toolCallId: pendingApproval.toolCallId,
      approved: false
    });
  }, [approveToolCall, pendingApproval]);

  const handleRetry = React.useCallback(() => {
    setDismissedError(null);
    clearError();
    if (messages.some((m) => m.role === "user")) {
      void regenerate();
    }
  }, [clearError, messages, regenerate]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    // overflow-hidden: own the scroll surface so the layout ScrollArea
    // doesn't become a second scroller around the chat.
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AgentHubEmptyState onSelectSuggestion={handleSelectSuggestion} />
        </div>
      ) : (
        // autoScroll + defaultScrollPosition="end": classic chat stick-to-bottom.
        // Do NOT set scrollAnchor on items — that pins the last message to the
        // top of the viewport and injects a large spacer (ChatGPT "new turn"
        // mode), which is what produced the huge empty region in the UI.
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
                {messages.map((msg) => {
                  const role =
                    msg.role === "user" || msg.role === "assistant" || msg.role === "system"
                      ? msg.role
                      : "assistant";
                  return (
                    <MessageScrollerItem key={msg.id} messageId={msg.id}>
                      <AgentHubMessageRow role={role}>
                        <AgentHubMessageParts parts={msg.parts ?? []} role={role} />
                      </AgentHubMessageRow>
                    </MessageScrollerItem>
                  );
                })}
                {isStreaming ? (
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
            isPending={approveToolCall.isPending}
          />
        ) : null}
      </div>

      <AgentHubPromptComposer
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        disabled={!!pendingApproval}
        isStreaming={isStreaming}
        onStop={() => void stop()}
      />
    </div>
  );
}
