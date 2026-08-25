"use client";

import { ExternalLinkIcon, FileTextIcon, MailIcon, PackageIcon, SparklesIcon } from "lucide-react";
import { type ComponentType, type SyntheticEvent } from "react";

import { type ApplicationOutput, isApplicationOpen } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  getApplicationPrimaryAction,
  listingUrlFor,
  type ApplicationPrimaryActionKind
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { useDashboardApplyPackage } from "@/pages/dashboard/tracked-jobs/_lib/use-dashboard-apply-package";

const PRIMARY_ACTION_ICONS: Record<
  ApplicationPrimaryActionKind,
  ComponentType<{ className?: string }>
> = {
  prepare: SparklesIcon,
  "add-jd": FileTextIcon,
  review: PackageIcon,
  "prepare-again": SparklesIcon,
  send: MailIcon,
  "open-listing": ExternalLinkIcon
};

function stopRowActivation(event: SyntheticEvent) {
  event.stopPropagation();
}

type ApplicationPrimaryActionButtonProps = {
  app: ApplicationOutput;
  /** `card`: full-width under board card content. `inline`: list action strip. */
  layout?: "card" | "inline";
  /**
   * When true, drop card margin/full-width so a parent coss Group owns layout
   * (joined corners / flex growth).
   */
  grouped?: boolean;
  /** Force button chrome when nested in an action Group (board = outline). */
  buttonVariant?: "default" | "outline";
  /** Icon-only control; label moves to aria-label + tooltip. */
  iconOnly?: boolean;
  className?: string;
};

/**
 * Smart primary CTA: Prepare → Review → Prepare again / Send → Open listing.
 * Shared by board cards and list action strip.
 */
export function ApplicationPrimaryActionButton({
  app,
  layout = "card",
  grouped = false,
  buttonVariant,
  iconOnly = false,
  className
}: ApplicationPrimaryActionButtonProps) {
  const { openEdit, openSendOutreach, openRegenerateConfirm } = useApplicationStore();
  const { reviewApplyKit, runGenerate, runReview, isPendingFor, busyLabelFor } =
    useDashboardApplyPackage();
  const primary = getApplicationPrimaryAction(app, { reviewApplyKit });
  const open = isApplicationOpen(app.outcome);

  if (!primary) return null;

  const Icon = PRIMARY_ACTION_ICONS[primary.kind];
  const generating =
    isPendingFor(app.id) &&
    (primary.kind === "prepare" || primary.kind === "review" || primary.kind === "prepare-again");
  const busyLabel = busyLabelFor(app.id);
  const actionLabel = busyLabel ?? primary.label;
  const disabled = !open || generating;
  const resolvedVariant =
    buttonVariant ?? (primary.kind === "open-listing" && !grouped ? "outline" : "default");

  function runPrimary() {
    switch (primary!.kind) {
      case "prepare":
        runGenerate(app.id);
        break;
      case "add-jd":
        openEdit(app);
        break;
      case "review":
        runReview(app.id);
        break;
      case "prepare-again":
        openRegenerateConfirm(app.id);
        break;
      case "send":
        openSendOutreach(app.id);
        break;
      case "open-listing": {
        const url = listingUrlFor(app);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        break;
      }
    }
  }

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant={resolvedVariant}
              className={cn("shrink-0 active:scale-[0.96]", className)}
              disabled={disabled}
              loading={generating}
              aria-label={actionLabel}
              onPointerDown={stopRowActivation}
              onClick={(event) => {
                stopRowActivation(event);
                runPrimary();
              }}
            />
          }
        >
          <Icon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipPopup>{actionLabel}</TooltipPopup>
      </Tooltip>
    );
  }

  return (
    <Button
      type="button"
      size={layout === "inline" ? "default" : "sm"}
      variant={resolvedVariant}
      className={cn(
        "active:scale-[0.96]",
        layout === "card" && !grouped && "mt-2.5 w-full",
        // Match Group chevron `icon-sm` (size-8 / sm:size-7) — do not force h-7 alone.
        grouped && layout === "card" && "min-w-0 flex-1",
        grouped && layout === "inline" && "min-w-0",
        className
      )}
      disabled={disabled}
      loading={generating}
      onPointerDown={stopRowActivation}
      onClick={(event) => {
        stopRowActivation(event);
        runPrimary();
      }}
    >
      <Icon aria-hidden="true" />
      {actionLabel}
    </Button>
  );
}
