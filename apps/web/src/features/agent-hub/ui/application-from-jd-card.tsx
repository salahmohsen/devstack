import { Building2, ExternalLink, MapPin } from "lucide-react";
import * as React from "react";

import { type ProposeApplicationFromJdOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";

import { HubHitlFrame } from "./hub-hitl-frame";

export type ApplicationFromJdCardInput = {
  title: string;
  companyName: string;
  description: string;
  url?: string | null;
  applyUrl?: string | null;
  location?: string | null;
  matchScore?: number | null;
  notes?: string | null;
};

export type ApplicationFromJdCardAction = ProposeApplicationFromJdOutput["action"];

export type ApplicationFromJdCardProps = {
  toolCallId: string;
  input: ApplicationFromJdCardInput;
  onSubmit: (output: { action: ApplicationFromJdCardAction }) => void;
  /** External disable (e.g. parent already submitting / stream busy). */
  disabled?: boolean;
  className?: string;
};

const ACTION_LABELS: Record<ApplicationFromJdCardAction, string> = {
  package: "Continue with package",
  save: "Save application only",
  dismiss: "Dismiss"
};

/** Compact labels for post-choice summary lines. */
export const PROPOSE_FROM_JD_CHOICE_LABELS: Record<ApplicationFromJdCardAction, string> = {
  package: "Continue with package",
  save: "Save only",
  dismiss: "Dismiss"
};

/**
 * Product GenUI card for hub client tool `propose-application-from-jd`.
 * Uses coss/`@tsu-stack/ui` Button — not AI Elements.
 */
export function ApplicationFromJdCard({
  toolCallId,
  input,
  onSubmit,
  disabled = false,
  className
}: ApplicationFromJdCardProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const locked = disabled || submitting;

  const listingUrl =
    typeof input.url === "string" && input.url.length > 0
      ? input.url
      : typeof input.applyUrl === "string" && input.applyUrl.length > 0
        ? input.applyUrl
        : null;

  const handleAction = React.useCallback(
    (action: ApplicationFromJdCardAction) => {
      if (locked) return;
      setSubmitting(true);
      onSubmit({ action });
    },
    [locked, onSubmit]
  );

  return (
    <HubHitlFrame
      kind="recommendation"
      title={input.title.trim() || "Untitled role"}
      description={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {input.companyName.trim() || "Unknown company"}
          </span>
          {input.location?.trim() ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {input.location.trim()}
            </span>
          ) : null}
          {typeof input.matchScore === "number" ? (
            <span className="text-xs font-medium text-foreground/80">
              Match {Math.round(input.matchScore)}%
            </span>
          ) : null}
        </div>
      }
      toolCallId={toolCallId}
      submitting={submitting}
      className={className}
      footer={
        <>
          <Button size="sm" onClick={() => handleAction("package")} disabled={locked} autoFocus>
            {ACTION_LABELS.package}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction("save")}
            disabled={locked}
          >
            {ACTION_LABELS.save}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("dismiss")}
            disabled={locked}
          >
            {ACTION_LABELS.dismiss}
          </Button>
        </>
      }
    >
      {listingUrl ? (
        <a
          href={listingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{listingUrl}</span>
        </a>
      ) : null}

      {input.description.trim() ? (
        <p className="mt-3 line-clamp-8 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {input.description}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground italic">No description provided yet.</p>
      )}

      {input.notes?.trim() ? (
        <p className="mt-2 text-xs text-muted-foreground">{input.notes.trim()}</p>
      ) : null}
    </HubHitlFrame>
  );
}
