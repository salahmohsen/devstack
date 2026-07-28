import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGE_LABELS,
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
