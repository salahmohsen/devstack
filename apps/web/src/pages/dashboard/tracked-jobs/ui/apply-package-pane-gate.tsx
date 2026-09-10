"use client";

import { TriangleAlertIcon } from "lucide-react";
import { type ReactNode } from "react";

import { Alert, AlertAction, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

export type PaneQueryGateProps = {
  pending: boolean;
  errored: boolean;
  /** One-line failure copy shown with the retry action. */
  errorTitle: string;
  onRetry: () => void;
  children: ReactNode;
};

/**
 * Shared data gate for apply-package panes: quiet pending row while profile
 * queries load, Alert+Retry on failure, children once data is safe to render.
 */
export function PaneQueryGate({
  pending,
  errored,
  errorTitle,
  onRetry,
  children
}: PaneQueryGateProps) {
  if (pending) {
    return (
      <div className="grid min-h-40 place-items-center">
        <output className="text-sm text-muted-foreground">Loading…</output>
      </div>
    );
  }
  if (errored) {
    return (
      <Alert variant="error">
        <TriangleAlertIcon />
        <AlertTitle className="min-w-0">{errorTitle}</AlertTitle>
        <AlertAction>
          <Button variant="outline" size="sm" type="button" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return <>{children}</>;
}
