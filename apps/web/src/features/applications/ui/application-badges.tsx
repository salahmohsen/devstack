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

export function ApplicationStageBadge({ stage, size = "sm", className }: StageBadgeProps) {
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
export function ApplicationStatusBadge({ outcome, size = "sm", className }: StatusBadgeProps) {
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
  size = "sm",
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
  size = "sm",
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
  className?: string;
};

function stopCardActivation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

/**
 * External apply destination + listing URL.
 * Only renders when `applyUrl` is set (Apply); View listing uses `url` when present.
 */
export function ApplicationApplyLinks({ applyUrl, url, className }: ApplyLinksProps) {
  if (!applyUrl) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      <a
        href={applyUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
        onClick={stopCardActivation}
        onPointerDown={stopCardActivation}
      >
        Apply
      </a>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline-offset-2 hover:underline"
          onClick={stopCardActivation}
          onPointerDown={stopCardActivation}
        >
          View listing
        </a>
      ) : null}
    </div>
  );
}
