"use client";

import { AiErrorBanner } from "@/shared/ui/ai-error-banner";

type AgentHubErrorCardProps = {
  /** Raw transport / agent error message (may include stacks). */
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

/**
 * Hub chat error surface — thin wrapper around the shared AI error banner.
 */
export function AgentHubErrorCard({ message, onRetry, onDismiss }: AgentHubErrorCardProps) {
  return (
    <AiErrorBanner
      message={message}
      feature="hub"
      severity="hard"
      onRetry={onRetry}
      onDismiss={onDismiss}
      className="mb-3 w-full"
    />
  );
}
