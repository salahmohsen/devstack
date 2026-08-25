import {
  Banknote,
  BookmarkPlus,
  Briefcase,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Laptop,
  Layers,
  MapPin,
  Package,
  Sparkles,
  X
} from "lucide-react";
import * as React from "react";

import {
  APPLICATION_APPLY_METHOD_LABELS,
  APPLICATION_SOURCE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  inferApplicationSource,
  type ProposeApplicationFromJdOutput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { type ProposeApplicationFromJdCardInput } from "@/features/agent-hub/lib/hub-tool-names";

import { HubHitlFrame } from "./hub-hitl-frame";

export type ApplicationFromJdCardInput = ProposeApplicationFromJdCardInput;

export type ApplicationFromJdCardAction = ProposeApplicationFromJdOutput["action"];

export type ApplicationFromJdCardProps = {
  toolCallId: string;
  input: ApplicationFromJdCardInput;
  onSubmit: (output: { action: ApplicationFromJdCardAction }) => void | Promise<void>;
  /** Action already taken (tool result, remount, or CRM). Receipt — no live buttons. */
  completedAction?: ApplicationFromJdCardAction | null;
  /** External disable (e.g. parent already submitting / stream busy). */
  disabled?: boolean;
  /** Older incomplete proposal — show chrome, no live actions. */
  superseded?: boolean;
  /** Hydrated listing is ready; take writer is still running. */
  takePending?: boolean;
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

const RECEIPT_COPY: Record<ApplicationFromJdCardAction, string> = {
  package: "Saved and started the apply package.",
  save: "Saved to Tracked jobs.",
  dismiss: "You dismissed this job."
};

const RECEIPT_BADGE: Record<ApplicationFromJdCardAction, string> = {
  package: "Package started",
  save: "Saved",
  dismiss: "Dismissed"
};

const PRESS =
  "transition-transform duration-150 ease-out active:scale-[0.96] disabled:active:scale-100";

function matchBadgeVariant(score: number): "success" | "warning" | "secondary" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "secondary";
}

function isHttpHref(value: string | null | undefined): value is string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return false;
  if (/^(none|null|undefined|n\/?a|nil|-)$/i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return /^https?:$/i.test(parsed.protocol);
  } catch {
    return false;
  }
}

function listingHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function listingPlatformLabel(href: string): string | null {
  const host = listingHost(href).toLowerCase();
  if (host.includes("breezy.hr")) return "Breezy";
  if (host.includes("greenhouse.io")) return "Greenhouse";
  if (host.includes("lever.co")) return "Lever";
  if (host.includes("ashbyhq.com")) return "Ashby";
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("indeed.com")) return "Indeed";
  return null;
}

function formatPostedOn(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
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

function SkillChipRow({
  label,
  names,
  variant
}: {
  label: string;
  names: string[];
  variant: "secondary" | "outline";
}) {
  if (names.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <li key={`${label}:${name}`}>
            <Badge variant={variant} size="sm" className="font-normal tracking-normal normal-case">
              {name}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
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
  completedAction = null,
  disabled = false,
  superseded = false,
  takePending = false,
  className
}: ApplicationFromJdCardProps) {
  const [pendingAction, setPendingAction] = React.useState<ApplicationFromJdCardAction | null>(
    null
  );
  const [localCompleted, setLocalCompleted] = React.useState<ApplicationFromJdCardAction | null>(
    null
  );
  const resolvedAction = completedAction ?? localCompleted;
  const submitting = pendingAction != null && resolvedAction == null;
  const locked = disabled || submitting || superseded || resolvedAction != null;

  const listingUrl = isHttpHref(input.url)
    ? input.url.trim()
    : isHttpHref(input.applyUrl)
      ? input.applyUrl.trim()
      : null;

  const handleAction = React.useCallback(
    (action: ApplicationFromJdCardAction) => {
      if (locked) return;
      setPendingAction(action);
      void Promise.resolve(onSubmit({ action }))
        .then(() => {
          setLocalCompleted(action);
          setPendingAction(null);
        })
        .catch(() => {
          setPendingAction(null);
        });
    },
    [locked, onSubmit]
  );

  const title = input.title.trim() || "Untitled role";
  const company = input.companyName.trim() || "Unknown company";
  const matchScore = typeof input.matchScore === "number" ? Math.round(input.matchScore) : null;
  const fromLocation = splitPlace(input.location);
  const workModeLabel = input.workMode ? WORK_MODE_LABELS[input.workMode] : fromLocation.workMode;
  const place = fromLocation.place;
  const applyHref = isHttpHref(input.applyUrl) ? input.applyUrl.trim() : null;
  const listingHref = isHttpHref(input.url)
    ? input.url.trim()
    : isHttpHref(listingUrl)
      ? listingUrl
      : null;
  const sourceLabel = input.source
    ? APPLICATION_SOURCE_LABELS[input.source]
    : listingHref
      ? APPLICATION_SOURCE_LABELS[inferApplicationSource(listingHref)]
      : null;
  const salary = input.salaryRange?.trim() ?? "";
  const requiredSkills = input.requiredSkills ?? [];
  const preferredSkills = input.preferredSkills ?? [];
  const applyMethodLabel = input.applyMethod
    ? APPLICATION_APPLY_METHOD_LABELS[input.applyMethod]
    : null;
  const employmentLabel =
    input.employmentType && input.employmentType !== "unknown"
      ? EMPLOYMENT_TYPE_LABELS[input.employmentType]
      : null;
  const department = input.department?.trim() ?? "";
  const experience = input.experience?.trim() ?? "";
  const postedOn = input.datePosted ? formatPostedOn(input.datePosted) : null;
  const platformLabel = listingHref ? listingPlatformLabel(listingHref) : null;
  const sourceDisplay =
    sourceLabel && sourceLabel !== "Other" ? sourceLabel : (platformLabel ?? null);

  return (
    <HubHitlFrame
      kind="recommendation"
      title={title}
      icon={
        <Briefcase className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      }
      aside={
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          {resolvedAction ? (
            <Badge
              variant={resolvedAction === "dismiss" ? "secondary" : "success"}
              size="sm"
              className="font-normal"
            >
              {RECEIPT_BADGE[resolvedAction]}
            </Badge>
          ) : null}
          <Badge
            variant={matchScore == null ? "outline" : matchBadgeVariant(matchScore)}
            size="sm"
            className="font-normal tabular-nums"
          >
            {matchScore == null ? "No match yet" : `${matchScore}% match`}
          </Badge>
        </span>
      }
      description={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {company}
          </span>
          {place ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {place}
            </span>
          ) : null}
          {workModeLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <Laptop className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {workModeLabel}
            </span>
          ) : null}
          {employmentLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {employmentLabel}
            </span>
          ) : null}
          {department.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {department}
            </span>
          ) : null}
          {salary.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Banknote className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {salary}
            </span>
          ) : null}
        </div>
      }
      toolCallId={toolCallId}
      className={className}
      footer={
        resolvedAction ? (
          <p className="m-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {resolvedAction === "dismiss" ? (
              <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <Check className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            )}
            {RECEIPT_COPY[resolvedAction]}
          </p>
        ) : superseded ? (
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
        {workModeLabel ? <DetailRow label="Work mode">{workModeLabel}</DetailRow> : null}
        {place ? <DetailRow label="Location">{place}</DetailRow> : null}
        {employmentLabel ? <DetailRow label="Employment">{employmentLabel}</DetailRow> : null}
        {department.length > 0 ? <DetailRow label="Department">{department}</DetailRow> : null}
        {experience.length > 0 ? <DetailRow label="Experience">{experience}</DetailRow> : null}
        {postedOn ? <DetailRow label="Posted">{postedOn}</DetailRow> : null}
        {salary.length > 0 ? (
          <DetailRow label="Salary">
            <span className="tabular-nums">{salary}</span>
          </DetailRow>
        ) : null}
        {applyMethodLabel && applyMethodLabel !== "Unknown" ? (
          <DetailRow label="Apply via">{applyMethodLabel}</DetailRow>
        ) : null}
        {sourceDisplay ? <DetailRow label="Source">{sourceDisplay}</DetailRow> : null}
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

      {requiredSkills.length > 0 || preferredSkills.length > 0 ? (
        <section className="mt-4 space-y-3" aria-label="Skills">
          <SkillChipRow label="Required skills" names={requiredSkills} variant="secondary" />
          <SkillChipRow label="Preferred skills" names={preferredSkills} variant="outline" />
        </section>
      ) : null}

      <section className="mt-4 space-y-1.5">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Description
        </h3>
        {input.description.trim() ? (
          <ScrollArea
            className="h-auto max-h-96 w-full rounded-lg border border-border/60 bg-background/40"
            scrollFade
            scrollbarGutter
          >
            <p className="px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {input.description}
            </p>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description provided yet.</p>
        )}
      </section>

      <section className="mt-4 space-y-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Agent's take
        </h3>
        {input.notes?.trim() ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-foreground">
            {input.notes.trim()}
          </p>
        ) : takePending ? (
          <p className="text-sm text-muted-foreground italic">Writing take…</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No agent take yet.</p>
        )}
      </section>
    </HubHitlFrame>
  );
}
