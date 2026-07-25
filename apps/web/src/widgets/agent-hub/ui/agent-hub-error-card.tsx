import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

type AgentHubErrorCardProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

/**
 * Inline error banner for the hub chat. Uses coss Alert (error variant)
 * so it matches the rest of the product — not a nested Card.
 */
export function AgentHubErrorCard({
  title = "Hub is unavailable",
  message = "Something went wrong. Try again in a moment.",
  onRetry,
  onDismiss
}: AgentHubErrorCardProps) {
  return (
    <Alert variant="error" className="mx-auto w-full max-w-3xl">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="m-0">{message}</p>
      </AlertDescription>
      {(onRetry != null || onDismiss != null) && (
        <AlertAction>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </AlertAction>
      )}
    </Alert>
  );
}
