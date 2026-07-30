import { Link } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  TriangleAlertIcon,
  WalletIcon
} from "lucide-react";
import * as React from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { parseHubChatError, type HubChatErrorKind } from "@/features/agent-hub";

type AgentHubErrorCardProps = {
  /** Raw transport / agent error message (may include stacks). */
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

function ErrorKindIcon({ kind }: { kind: HubChatErrorKind }) {
  const className = "size-4 shrink-0";
  switch (kind) {
    case "insufficient_balance":
      return <WalletIcon aria-hidden className={className} />;
    case "missing_byo":
      return <KeyRoundIcon aria-hidden className={className} />;
    case "unauthorized":
    case "unavailable":
    case "unknown":
      return <TriangleAlertIcon aria-hidden className={className} />;
  }
}

/**
 * Inline error banner for hub chat.
 * Classifies provider/auth failures into calm copy + recovery actions.
 * Technical details stay collapsed so stacks never dominate the surface.
 */
export function AgentHubErrorCard({ message, onRetry, onDismiss }: AgentHubErrorCardProps) {
  const presentation = React.useMemo(() => parseHubChatError(message), [message]);
  const showTechnical =
    presentation.technicalDetails != null &&
    presentation.technicalDetails.length > 0 &&
    presentation.technicalDetails !== presentation.description;

  const hasActions =
    presentation.billingUrl != null ||
    presentation.showAiSettings ||
    (onRetry != null && presentation.retryable) ||
    onDismiss != null;

  return (
    <Alert
      variant={presentation.variant}
      className="mx-auto w-full max-w-3xl"
      aria-live="assertive"
    >
      <ErrorKindIcon kind={presentation.kind} />
      <AlertTitle className="text-pretty">{presentation.title}</AlertTitle>
      <AlertDescription>
        <p className="m-0 leading-relaxed text-pretty">{presentation.description}</p>

        {showTechnical ? (
          <details className="group mt-2 rounded-lg border border-border/60 bg-background/40">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
                "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                "[&::-webkit-details-marker]:hidden"
              )}
            >
              <ChevronDownIcon
                className="size-3.5 shrink-0 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
              Technical details
            </summary>
            <pre className="max-h-32 overflow-auto border-t border-border/50 px-2.5 py-2 font-mono text-[11px] leading-snug break-all whitespace-pre-wrap text-muted-foreground">
              {presentation.technicalDetails}
            </pre>
          </details>
        ) : null}
      </AlertDescription>

      {hasActions ? (
        <AlertAction className="flex-wrap justify-end gap-1.5">
          {presentation.billingUrl ? (
            <Button
              variant="default"
              size="sm"
              render={
                <a
                  href={presentation.billingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open provider billing"
                />
              }
            >
              Open billing
              <ExternalLinkIcon aria-hidden />
            </Button>
          ) : null}
          {presentation.showAiSettings ? (
            <Button
              variant={presentation.billingUrl ? "outline" : "default"}
              size="sm"
              render={<Link to="/dashboard/settings/ai" aria-label="Open AI settings" />}
            >
              AI settings
            </Button>
          ) : null}
          {onRetry && presentation.retryable ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
