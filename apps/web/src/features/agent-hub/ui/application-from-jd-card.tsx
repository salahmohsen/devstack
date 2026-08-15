import {
  BookmarkPlus,
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  X
} from "lucide-react";
import * as React from "react";

import { type ProposeApplicationFromJdOutput } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { IconSwap } from "@tsu-stack/ui/components/icon-swap";

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
  /** Older incomplete proposal — show chrome, no live actions. */
  superseded?: boolean;
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

const PRESS =
  "transition-transform duration-150 ease-out active:scale-[0.96] disabled:active:scale-100";

function matchBadgeVariant(score: number): "success" | "warning" | "secondary" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "secondary";
}

function listingHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function splitPlace(location: string | null | undefined): {
  workMode: string | null;
  place: string | null;
} {
  const raw = location?.trim() ?? "";
  if (!raw) return { workMode: null, place: null };
  const remote = /\bremote\b/i.exec(raw);
  const hybrid = /\bhybrid\b/i.exec(raw);
  const onsite = /\b(on[\s-]?site|office)\b/i.exec(raw);
  const workMode = remote ? "Remote" : hybrid ? "Hybrid" : onsite ? "On-site" : null;
  const place = raw
    .replace(/\b(remote|hybrid|on[\s-]?site|office)\b/gi, "")
    .replace(/^[·|,/\-\s]+|[·|,/\-\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { workMode, place: place.length > 0 ? place : workMode ? null : raw };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 text-sm">
      <dt className="pt-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Product GenUI card for hub client tool `propose-application-from-jd`.
 * Uses coss/`@tsu-stack/ui` Button — not AI Elements.
 */
export function ApplicationFromJdCard({
  toolCallId,
  input,
  onSubmit,
  disabled = false,
  superseded = false,
  className
}: ApplicationFromJdCardProps) {
  const [pendingAction, setPendingAction] = React.useState<ApplicationFromJdCardAction | null>(
    null
  );
  const submitting = pendingAction != null;
  const locked = disabled || submitting || superseded;

  const listingUrl =
    typeof input.url === "string" && input.url.length > 0
      ? input.url
      : typeof input.applyUrl === "string" && input.applyUrl.length > 0
        ? input.applyUrl
        : null;

  const handleAction = React.useCallback(
    (action: ApplicationFromJdCardAction) => {
      if (locked) return;
      setPendingAction(action);
      onSubmit({ action });
    },
    [locked, onSubmit]
  );

  const title = input.title.trim() || "Untitled role";
  const company = input.companyName.trim() || "Unknown company";
  const matchScore = typeof input.matchScore === "number" ? Math.round(input.matchScore) : null;
  const { workMode, place } = splitPlace(input.location);
  const applyHref =
    typeof input.applyUrl === "string" && input.applyUrl.length > 0 ? input.applyUrl : null;
  const listingHref =
    typeof input.url === "string" && input.url.length > 0 ? input.url : listingUrl;

  return (
    <HubHitlFrame
      kind="recommendation"
      title={title}
      icon={
        <IconSwap
          state={submitting ? "b" : "a"}
          className="size-4 shrink-0"
          iconA={<Briefcase className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />}
          iconB={
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
          }
        />
      }
      aside={
        <Badge
          variant={matchScore == null ? "outline" : matchBadgeVariant(matchScore)}
          size="sm"
          className="font-normal tabular-nums"
        >
          {matchScore == null ? "No match yet" : `${matchScore}% match`}
        </Badge>
      }
      description={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {company}
          </span>
          {place || workMode ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {[workMode, place].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>
      }
      toolCallId={toolCallId}
      submitting={submitting}
      className={className}
      footer={
        superseded ? (
          <p className="m-0 text-xs text-muted-foreground">
            A newer proposal is waiting below. These actions are closed.
          </p>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              animate={false}
              className={PRESS}
              onClick={() => handleAction("package")}
              disabled={locked}
              loading={pendingAction === "package"}
              autoFocus
            >
              <Package className="size-3.5" strokeWidth={2} aria-hidden />
              {ACTION_LABELS.package}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              animate={false}
              className={PRESS}
              onClick={() => handleAction("save")}
              disabled={locked}
              loading={pendingAction === "save"}
            >
              <BookmarkPlus className="size-3.5" strokeWidth={2} aria-hidden />
              {ACTION_LABELS.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              animate={false}
              className={PRESS}
              onClick={() => handleAction("dismiss")}
              disabled={locked}
              loading={pendingAction === "dismiss"}
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden />
              {ACTION_LABELS.dismiss}
            </Button>
          </>
        )
      }
    >
      <dl className="space-y-2">
        <DetailRow label="Company">{company}</DetailRow>
        {workMode || place ? (
          <DetailRow label="Location">{[workMode, place].filter(Boolean).join(" · ")}</DetailRow>
        ) : null}
        {listingHref ? (
          <DetailRow label="Listing">
            <a
              href={listingHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{listingHost(listingHref)}</span>
            </a>
          </DetailRow>
        ) : null}
        {applyHref && applyHref !== listingHref ? (
          <DetailRow label="Apply">
            <a
              href={applyHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{listingHost(applyHref)}</span>
            </a>
          </DetailRow>
        ) : null}
      </dl>

      <section className="mt-4 space-y-1.5">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Description
        </h3>
        {input.description.trim() ? (
          <p className="line-clamp-8 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {input.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description provided yet.</p>
        )}
      </section>

      {input.notes?.trim() ? (
        <section className="mt-4 space-y-1.5">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Why this role
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{input.notes.trim()}</p>
        </section>
      ) : null}
    </HubHitlFrame>
  );
}
