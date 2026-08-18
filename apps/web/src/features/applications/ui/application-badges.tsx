import {
  APPLICATION_APPLY_METHOD_LABELS,
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGE_LABELS,
  type ApplicationApplyMethod,
  type ApplicationOutcome,
  type ApplicationStage
} from "@tsu-stack/core";
import { Badge, type BadgeProps } from "@tsu-stack/ui/components/badge";
import { cn } from "@tsu-stack/ui/lib/utils";

export type ApplicationBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Stage badge colors — shared by board column counts, list chips, and the side panel.
 * Keep in sync across all application surfaces.
 */
export const APPLICATION_STAGE_BADGE_VARIANT: Record<ApplicationStage, ApplicationBadgeVariant> = {
  saved: "secondary",
  applied: "info",
  screening: "warning",
  interview: "default",
  offer: "success"
};

/** Outcome / closed-status badge colors. */
export const APPLICATION_OUTCOME_BADGE_VARIANT: Record<
  ApplicationOutcome,
  ApplicationBadgeVariant
> = {
  rejected: "error",
  withdrawn: "secondary",
  ghosted: "warning",
  accepted: "success"
};

/** Open (no outcome) uses a distinct calm color from closed outcomes. */
export const APPLICATION_OPEN_BADGE_VARIANT: ApplicationBadgeVariant = "info";

type StageBadgeProps = {
  stage: ApplicationStage;
  size?: BadgeProps["size"];
  className?: string;
};

export function ApplicationStageBadge({ stage, size = "xs", className }: StageBadgeProps) {
  return (
    <Badge
      variant={APPLICATION_STAGE_BADGE_VARIANT[stage]}
      size={size}
      className={cn("font-normal", className)}
    >
      {APPLICATION_STAGE_LABELS[stage]}
    </Badge>
  );
}

type StatusBadgeProps = {
  outcome: ApplicationOutcome | null | undefined;
  size?: BadgeProps["size"];
  className?: string;
};

/** Open (no outcome) or closed outcome label. */
export function ApplicationStatusBadge({ outcome, size = "xs", className }: StatusBadgeProps) {
  if (outcome == null) {
    return (
      <Badge
        variant={APPLICATION_OPEN_BADGE_VARIANT}
        size={size}
        className={cn("font-normal", className)}
      >
        Open
      </Badge>
    );
  }

  return (
    <Badge
      variant={APPLICATION_OUTCOME_BADGE_VARIANT[outcome]}
      size={size}
      className={cn("font-normal", className)}
    >
      {APPLICATION_OUTCOME_LABELS[outcome]}
    </Badge>
  );
}

type MatchScoreBadgeProps = {
  matchScore: number | null | undefined;
  size?: BadgeProps["size"];
  className?: string;
};

/** `87% match` when score is known (0–100). */
export function ApplicationMatchScoreBadge({
  matchScore,
  size = "xs",
  className
}: MatchScoreBadgeProps) {
  if (matchScore == null) return null;

  return (
    <Badge variant="secondary" size={size} className={cn("font-normal tabular-nums", className)}>
      {matchScore}% match
    </Badge>
  );
}

type ApplyMethodBadgeProps = {
  applyMethod: ApplicationApplyMethod;
  size?: BadgeProps["size"];
  className?: string;
};

/** Easy Apply / External / Email — hidden when unknown. */
export function ApplicationApplyMethodBadge({
  applyMethod,
  size = "xs",
  className
}: ApplyMethodBadgeProps) {
  if (applyMethod === "unknown") return null;

  return (
    <Badge variant="outline" size={size} className={cn("font-normal", className)}>
      {APPLICATION_APPLY_METHOD_LABELS[applyMethod]}
    </Badge>
  );
}

type ApplyLinksProps = {
  applyUrl: string | null | undefined;
  url: string | null | undefined;
  /** Used when only the listing `url` is present (e.g. Easy Apply without a separate apply link). */
  applyMethod?: ApplicationApplyMethod | null;
  /** When true, omit the secondary “Open listing” text (row action button already covers it). */
  hideListingLink?: boolean;
  className?: string;
};

function stopCardActivation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

/**
 * External apply destination + listing URL.
 * Prefer `applyUrl` for Apply; when it is missing, fall back to `url` (Easy Apply / Open listing).
 */
export function ApplicationApplyLinks({
  applyUrl,
  url,
  applyMethod,
  hideListingLink = false,
  className
}: ApplyLinksProps) {
  if (!applyUrl && !url) return null;

  // When listing is only shown via the action button, skip pure “Open listing” primary text.
  if (hideListingLink && !applyUrl) return null;

  const primaryHref = applyUrl ?? url!;
  const primaryLabel = applyUrl
    ? "Apply"
    : applyMethod === "easy_apply"
      ? "Easy Apply"
      : "Open listing";
  const showListing = Boolean(!hideListingLink && url && applyUrl && url !== applyUrl);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      <a
        href={primaryHref}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
        onClick={stopCardActivation}
        onPointerDown={stopCardActivation}
      >
        {primaryLabel}
      </a>
      {showListing ? (
        <a
          href={url!}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline-offset-2 hover:underline"
          onClick={stopCardActivation}
          onPointerDown={stopCardActivation}
        >
          Open listing
        </a>
      ) : null}
    </div>
  );
}
