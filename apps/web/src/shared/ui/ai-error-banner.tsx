"use client";

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

import {
  presentAiError,
  type AiErrorFeature,
  type AiErrorKind,
  type AiErrorPresentation,
  type AiErrorSeverity
} from "@/shared/lib/parse-ai-error";

export type AiErrorBannerProps = {
  /** Raw transport / agent error message (may include stacks). */
  message?: string | null;
  /**
   * Soft-fail notes from workflows. Never shown as a bullet list —
   * folded into collapsed technical details only.
   */
  notes?: string[];
  /** Task context for title overrides on generic failures. */
  feature?: AiErrorFeature;
  /**
   * hard — task blocked (error tone when kind is unknown)
   * partial — some results available (warning tone)
   */
  severity?: AiErrorSeverity;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  /** Tighter padding for dialogs / dense surfaces. */
  density?: "default" | "compact";
  /** Override presentation after presentAiError (tests / rare cases). */
  presentation?: AiErrorPresentation;
};

function ErrorKindIcon({ kind }: { kind: AiErrorKind }) {
  const className = "size-4 shrink-0";
  switch (kind) {
    case "insufficient_balance":
      return <WalletIcon className={className} />;
    case "missing_byo":
      return <KeyRoundIcon className={className} />;
    case "unauthorized":
    case "unavailable":
    case "unknown":
      return <TriangleAlertIcon className={className} />;
  }
}

/**
 * Shared AI failure / partial-success banner.
 *
 * One title, one recovery instruction, one primary action.
 * Technical noise stays collapsed. Used by Hub, organize, resume, review.
 */
export function AiErrorBanner({
  message,
  notes,
  feature = "generic",
  severity = "hard",
  onRetry,
  onDismiss,
  className,
  density = "default",
  presentation: presentationOverride
}: AiErrorBannerProps) {
  const presentation = React.useMemo(
    () => presentationOverride ?? presentAiError(message, { feature, severity, notes }),
    [presentationOverride, message, feature, severity, notes]
  );

  const showTechnical =
    presentation.technicalDetails != null &&
    presentation.technicalDetails.length > 0 &&
    presentation.technicalDetails !== presentation.description &&
    // Don't open a details block for a single short sentence that already is the description
    !(
      presentation.technicalDetails.length < 120 &&
      presentation.technicalDetails === message?.trim()
    );

  // Prefer the strongest recovery first; only one primary (default) button.
  const primaryIsBilling = presentation.billingUrl != null;
  const primaryIsSettings = !primaryIsBilling && presentation.showAiSettings;
  const primaryIsRetry =
    !primaryIsBilling && !primaryIsSettings && onRetry != null && presentation.retryable;

  const hasSecondaryRetry =
    onRetry != null && presentation.retryable && (primaryIsBilling || primaryIsSettings);

  const hasActions =
    primaryIsBilling ||
    primaryIsSettings ||
    primaryIsRetry ||
    hasSecondaryRetry ||
    onDismiss != null;

  return (
    <Alert
      variant={presentation.variant}
      className={cn("w-full", density === "compact" && "px-3 py-2.5", className)}
      aria-live={severity === "hard" ? "assertive" : "polite"}
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
              Details
            </summary>
            <pre className="max-h-28 overflow-auto border-t border-border/50 px-2.5 py-2 font-mono text-[11px] leading-snug break-all whitespace-pre-wrap text-muted-foreground">
              {presentation.technicalDetails}
            </pre>
          </details>
        ) : null}
      </AlertDescription>

      {hasActions ? (
        <AlertAction className="flex-wrap justify-end gap-1.5">
          {primaryIsBilling && presentation.billingUrl ? (
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => {
                window.open(presentation.billingUrl!, "_blank", "noopener,noreferrer");
              }}
            >
              Open billing
              <ExternalLinkIcon aria-hidden />
            </Button>
          ) : null}
          {presentation.showAiSettings ? (
            <Button
              variant={primaryIsSettings ? "default" : "outline"}
              size="sm"
              render={<Link to="/dashboard/settings/ai" />}
            >
              AI settings
            </Button>
          ) : null}
          {onRetry && presentation.retryable ? (
            <Button
              variant={primaryIsRetry ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={onRetry}
            >
              Try again
            </Button>
          ) : null}
          {onDismiss ? (
            <Button variant="ghost" size="sm" type="button" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
