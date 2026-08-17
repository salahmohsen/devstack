"use client";

import { MessagePrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { useState, type FC } from "react";

import { type AiErrorFeature } from "@/shared/lib/parse-ai-error";
import { AiErrorBanner } from "@/shared/ui/ai-error-banner";

function selectMessageErrorText(s: {
  message: { status?: { type?: string; reason?: string; error?: unknown } };
}): string | undefined {
  const status = s.message.status;
  if (status?.type !== "incomplete" || status.reason !== "error") return undefined;
  const error = status.error;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "An error occurred";
}

function isMessageErrorStatus(s: {
  message: { status?: { type?: string; reason?: string } };
}): boolean {
  return s.message.status?.type === "incomplete" && s.message.status.reason === "error";
}

export function messageHasErrorStatus(s: {
  message: { status?: { type?: string; reason?: string } };
}): boolean {
  return isMessageErrorStatus(s);
}

type MessageErrorProps = {
  feature?: AiErrorFeature;
  onRetry?: () => void;
};

/**
 * TAP-only. Dismiss lives in `MessageErrorBanner` so this never mixes
 * `useAuiState` with React `useState`.
 */
export const MessageError: FC<MessageErrorProps> = ({ feature = "generic", onRetry }) => (
  <MessagePrimitive.Error>
    <MessageErrorBody feature={feature} onRetry={onRetry} />
  </MessagePrimitive.Error>
);

function MessageErrorBody({ feature = "generic", onRetry }: MessageErrorProps) {
  const aui = useAui();
  const message = useAuiState(selectMessageErrorText);

  return (
    <MessageErrorBanner
      message={message}
      feature={feature}
      onRetry={() => {
        if (onRetry) {
          onRetry();
          return;
        }
        if (aui.message.source != null) aui.message.reload();
      }}
    />
  );
}

function MessageErrorBanner({
  message,
  feature,
  onRetry
}: {
  message: string | undefined;
  feature: AiErrorFeature;
  onRetry: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <AiErrorBanner
      message={message}
      feature={feature}
      severity="hard"
      onRetry={() => {
        setDismissed(false);
        onRetry();
      }}
      onDismiss={() => setDismissed(true)}
      className="w-full"
    />
  );
}
