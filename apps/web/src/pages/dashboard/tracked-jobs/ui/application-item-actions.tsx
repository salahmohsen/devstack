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
import { useState, type ComponentType } from "react";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  type ApplicationOutcome,
  type ApplicationOutput,
  type ApplicationStage
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  listingUrlFor,
  useDeleteApplicationsMutation,
  useSetOutcomeMutation,
  useUpdateStageMutation
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
  density = "full"
}: {
  app: ApplicationOutput;
  slots: ApplicationActionSlots;
  density?: "full" | "list-overflow";
}) {
  const { openEdit, openView, closeView, viewItem, selectedIds, toggleSelect } =
    useApplicationStore();
  const updateStage = useUpdateStageMutation();
  const setOutcome = useSetOutcomeMutation();
  const deleteMutation = useDeleteApplicationsMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;

  const listingUrl = listingUrlFor(app);
  const openListing = listingUrl
    ? () => {
        window.open(listingUrl, "_blank", "noopener,noreferrer");
      }
    : undefined;
  const isBatchSelected = selectedIds.includes(app.id);

  function confirmDelete() {
    deleteMutation.mutate(
      { ids: [app.id] },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          if (viewItem?.id === app.id) closeView();
        }
      }
    );
  }

  return (
    <>
      <Item onClick={() => openView(app)}>
        <EyeIcon aria-hidden="true" />
        View
      </Item>
      {openListing ? (
        <Item onClick={openListing}>
          <ExternalLinkIcon aria-hidden="true" />
          {APPLICATION_PRIMARY_ACTION_LABELS.openListing}
        </Item>
      ) : null}
      {density === "full" ? (
        <Item onClick={() => openEdit(app)}>
          <PencilIcon aria-hidden="true" />
          Edit
        </Item>
      ) : null}
      <Item onClick={() => toggleSelect(app.id)}>
        {isBatchSelected ? (
          <SquareCheckIcon aria-hidden="true" />
        ) : (
          <SquareIcon aria-hidden="true" />
        )}
        {isBatchSelected ? "Deselect" : "Select"}
      </Item>

      <Separator />

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

      <ApplyPackageMenuItems app={app} slots={{ Item, Separator, Sub, SubTrigger, SubPopup }} />

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

      <Item
        variant="destructive"
        disabled={deleteMutation.isPending}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2Icon aria-hidden="true" />
        Delete
      </Item>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the application from your pipeline. Prefer Close as for roles
              that ended — only use delete for mistakes or test data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              onClick={() => {
                confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
