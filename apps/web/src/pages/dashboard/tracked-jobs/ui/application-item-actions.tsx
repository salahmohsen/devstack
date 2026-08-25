"use client";

import {
  ArrowRightLeftIcon,
  BookmarkIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  GhostIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
  SquareCheckIcon,
  SquareIcon,
  Trash2Icon,
  XCircleIcon
} from "lucide-react";
import { type ComponentType } from "react";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  type ApplicationOutcome,
  type ApplicationOutput,
  type ApplicationStage
} from "@tsu-stack/core";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  listingUrlFor,
  useSetOutcomeMutation,
  useUpdateStageMutation,
  type ApplicationPrimaryActionKind
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { type ApplicationActionSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
import { ApplyPackageMenuItems } from "@/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions";

export type {
  ApplicationActionItemProps,
  ApplicationActionMenuSlots,
  ApplicationActionSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
export {
  applicationContextSlots,
  applicationListMenuSlots,
  applicationMenuSlots,
  createApplicationContextSlots,
  createApplicationMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";

const STAGE_ICONS: Record<ApplicationStage, ComponentType<{ className?: string }>> = {
  saved: BookmarkIcon,
  applied: CircleIcon,
  screening: PhoneIcon,
  interview: CircleDotIcon,
  offer: SparklesIcon
};

const OUTCOME_ICONS: Record<ApplicationOutcome, ComponentType<{ className?: string }>> = {
  rejected: XCircleIcon,
  withdrawn: CircleDashedIcon,
  ghosted: GhostIcon,
  accepted: CheckCircle2Icon
};

/**
 * Shared overflow / context menu for a tracked application (board card + list).
 * View, listing, edit, stage move, apply package, close outcome, delete.
 *
 * `density="list-overflow"`: skip Edit (already on the list action strip).
 * Open listing stays in the menu when the strip primary is Prepare/Review/Send.
 */
export function ApplicationItemActions({
  app,
  slots,
  density = "full",
  hidePrimaryKind = null,
  hideOpenListing = false,
  showBatchSelect = true,
  showView = true
}: {
  app: ApplicationOutput;
  slots: ApplicationActionSlots;
  density?: "full" | "list-overflow";
  /** Omit the overflow entry that matches the visible magic CTA. */
  hidePrimaryKind?: ApplicationPrimaryActionKind | null;
  /** Omit Open listing when it already appears as a Group segment. */
  hideOpenListing?: boolean;
  /**
   * Board/list multi-select. Off for single-item inspect panel menus.
   */
  showBatchSelect?: boolean;
  /** Off for inspect panel — already viewing this job. */
  showView?: boolean;
}) {
  const { openEdit, openView, selectedIds, toggleSelect, openDeleteConfirm } =
    useApplicationStore();
  const updateStage = useUpdateStageMutation();
  const setOutcome = useSetOutcomeMutation();
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;

  const listingUrl = listingUrlFor(app);
  const openListing = listingUrl
    ? () => {
        window.open(listingUrl, "_blank", "noopener,noreferrer");
      }
    : undefined;
  const isBatchSelected = selectedIds.includes(app.id);
  const showOpenListing =
    Boolean(openListing) && hidePrimaryKind !== "open-listing" && !hideOpenListing;
  const showEdit = density === "full";
  const hasTopActions = showView || showOpenListing || showEdit || showBatchSelect;

  return (
    <>
      {showView ? (
        <Item onClick={() => openView(app)}>
          <EyeIcon aria-hidden="true" />
          View
        </Item>
      ) : null}
      {showOpenListing ? (
        <Item onClick={openListing}>
          <ExternalLinkIcon aria-hidden="true" />
          {APPLICATION_PRIMARY_ACTION_LABELS.openListing}
        </Item>
      ) : null}
      {showEdit ? (
        <Item onClick={() => openEdit(app)}>
          <PencilIcon aria-hidden="true" />
          Edit
        </Item>
      ) : null}
      {showBatchSelect ? (
        <Item onClick={() => toggleSelect(app.id)}>
          {isBatchSelected ? (
            <SquareCheckIcon aria-hidden="true" />
          ) : (
            <SquareIcon aria-hidden="true" />
          )}
          {isBatchSelected ? "Deselect" : "Select"}
        </Item>
      ) : null}

      {hasTopActions ? <Separator /> : null}

      <Sub>
        <SubTrigger>
          <ArrowRightLeftIcon aria-hidden="true" />
          Move to
        </SubTrigger>
        <SubPopup>
          {APPLICATION_STAGES.filter((s) => s !== app.stage).map((stage) => {
            const Icon = STAGE_ICONS[stage];
            return (
              <Item key={stage} onClick={() => updateStage.mutate({ id: app.id, stage })}>
                <Icon aria-hidden="true" />
                {APPLICATION_STAGE_LABELS[stage]}
              </Item>
            );
          })}
        </SubPopup>
      </Sub>

      <ApplyPackageMenuItems
        app={app}
        slots={{ Item, Separator, Sub, SubTrigger, SubPopup }}
        hidePrimaryKind={hidePrimaryKind}
      />

      <Sub>
        <SubTrigger>
          <XCircleIcon aria-hidden="true" />
          Close as
        </SubTrigger>
        <SubPopup>
          {(Object.keys(APPLICATION_OUTCOME_LABELS) as ApplicationOutcome[]).map((outcome) => {
            const Icon = OUTCOME_ICONS[outcome];
            return (
              <Item
                key={outcome}
                onClick={() => setOutcome.mutate({ id: app.id, outcome })}
                variant={
                  outcome === "rejected" || outcome === "withdrawn" ? "destructive" : "default"
                }
              >
                <Icon aria-hidden="true" />
                {APPLICATION_OUTCOME_LABELS[outcome]}
              </Item>
            );
          })}
        </SubPopup>
      </Sub>

      <Separator />

      <Item variant="destructive" onClick={() => openDeleteConfirm(app)}>
        <Trash2Icon aria-hidden="true" />
        Delete
      </Item>
    </>
  );
}
