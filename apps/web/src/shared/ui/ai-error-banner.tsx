"use client";

import { Link } from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
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
    case "provider_error":
    case "unknown":
      return <TriangleAlertIcon className={className} />;
  }
}

function useCopyToClipboard(copiedDuration = 2000) {
  const [isCopied, setIsCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => 
    () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  , []);

  const copyToClipboard = React.useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
      void navigator.clipboard.writeText(value).then(
        () => {
          setIsCopied(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setIsCopied(false), copiedDuration);
        },
        () => {}
      );
    },
    [copiedDuration]
  );

  return { isCopied, copyToClipboard };
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

  const { isCopied, copyToClipboard } = useCopyToClipboard();

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

  const externalLabel =
    presentation.externalActionLabel ??
    (presentation.kind === "insufficient_balance" ? "Open billing" : "Open link");

  // Multi-action recovery lives under the copy (shared leading edge with title/
  // description). Side AlertAction is reserved for a single primary CTA.
  const actionCount =
    Number(primaryIsBilling) +
    Number(presentation.showAiSettings) +
    Number(Boolean(onRetry && presentation.retryable)) +
    Number(Boolean(onDismiss));
  const actionsInlineUnderCopy = actionCount > 1;

  const actionButtonClassName =
    "shrink-0 active:scale-[0.96] transition-transform duration-150 ease-out";

  const actions = hasActions ? (
    <>
      {primaryIsBilling && presentation.billingUrl ? (
        <Button
          variant="default"
          size="sm"
          type="button"
          className={actionButtonClassName}
          onClick={() => {
            window.open(presentation.billingUrl!, "_blank", "noopener,noreferrer");
          }}
        >
          {externalLabel}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </Button>
      ) : null}
      {presentation.showAiSettings ? (
        <Button
          variant={primaryIsSettings ? "default" : "outline"}
          size="sm"
          className={actionButtonClassName}
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
          className={actionButtonClassName}
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
      {onDismiss ? (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className={actionButtonClassName}
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      ) : null}
    </>
  ) : null;

  return (
    <Alert
      variant={presentation.variant}
      className={cn(
        "w-full items-start gap-y-1",
        density === "compact" && "px-3 py-2.5",
        className
      )}
      aria-live={severity === "hard" ? "assertive" : "polite"}
    >
      <ErrorKindIcon kind={presentation.kind} />
      <AlertTitle className="min-w-0 leading-snug text-pretty">{presentation.title}</AlertTitle>
      <AlertDescription className="min-w-0 gap-2.5">
        <p className="m-0 max-w-prose leading-relaxed text-pretty wrap-break-word">
          {presentation.description}
        </p>

        {showTechnical ? (
          <details className="group max-w-prose overflow-hidden rounded-lg border border-border/60 bg-background/40">
            <summary
              className={cn(
                "flex min-h-8 cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
                "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                "[&::-webkit-details-marker]:hidden"
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <ChevronDownIcon
                  className="size-3.5 shrink-0 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden
                />
                Details
              </span>
              <button
                type="button"
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                  "transition-[color,transform,opacity] duration-150 ease-out",
                  "hover:bg-muted hover:text-foreground",
                  "active:scale-[0.96]",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                )}
                aria-label={isCopied ? "Copied error details" : "Copy error details"}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (presentation.technicalDetails) {
                    copyToClipboard(presentation.technicalDetails);
                  }
                }}
              >
                <span className="relative size-3.5">
                  <CopyIcon
                    className={cn(
                      "absolute inset-0 size-3.5 transition-[opacity,transform,filter] duration-150 ease-out",
                      isCopied
                        ? "scale-[0.25] opacity-0 blur-xs"
                        : "blur-0 scale-100 opacity-100"
                    )}
                    aria-hidden
                  />
                  <CheckIcon
                    className={cn(
                      "absolute inset-0 size-3.5 transition-[opacity,transform,filter] duration-150 ease-out",
                      isCopied
                        ? "blur-0 scale-100 opacity-100"
                        : "scale-[0.25] opacity-0 blur-xs"
                    )}
                    aria-hidden
                  />
                </span>
              </button>
            </summary>
            <pre className="max-h-28 overflow-auto border-t border-border/50 px-2.5 py-2 font-mono text-[11px] leading-snug break-all whitespace-pre-wrap text-muted-foreground">
              {presentation.technicalDetails}
            </pre>
          </details>
        ) : null}

        {actionsInlineUnderCopy && actions ? (
          <div
            className="flex flex-wrap items-center gap-2 pt-0.5"
            data-slot="alert-inline-actions"
          >
            {actions}
          </div>
        ) : null}
      </AlertDescription>

      {!actionsInlineUnderCopy && actions ? (
        <AlertAction className="flex items-center gap-2 self-start sm:self-center">
          {actions}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
