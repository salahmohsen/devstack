"use client";

import { ChevronDownIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  getApplicationPrimaryAction,
  listingUrlFor
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  ApplicationItemActions,
  applicationListMenuSlots,
  applicationMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";
import { ApplicationPrimaryActionButton } from "@/pages/dashboard/tracked-jobs/ui/application-primary-action-button";

export type ApplicationActionGroupProps = {
  app: ApplicationOutput;
  /**
   * - `board`: bordered [Magic | Open listing? | ▾]
   * - `list`: filled [Magic | Open listing? | ▾] — no Edit
   * - `panel`: filled [Magic | Edit | Open listing? | ▾]
   */
  variant: "board" | "list" | "panel";
  className?: string;
};

/**
 * coss Group for tracked-jobs magic CTA + overflow chevron.
 * Board uses outline (bordered); list/panel use default (filled primary).
 */
export function ApplicationActionGroup({ app, variant, className }: ApplicationActionGroupProps) {
  const { openEdit } = useApplicationStore();
  const primary = getApplicationPrimaryAction(app);
  const listingUrl = listingUrlFor(app);
  const isBoard = variant === "board";
  const showEdit = variant === "panel";
  const buttonVariant = isBoard ? "outline" : "default";
  const slots = isBoard ? applicationMenuSlots : applicationListMenuSlots;
  // Skip Edit in the menu only when Edit is already a Group segment (panel).
  const density = showEdit ? "list-overflow" : "full";
  /** Listing segment unless magic CTA is already Open listing. */
  const showListingInGroup = Boolean(listingUrl) && primary?.kind !== "open-listing";
  const hidePrimaryKind = primary?.kind ?? null;
  const hideOpenListingInMenu = showListingInGroup || hidePrimaryKind === "open-listing";

  const segmentSize = isBoard ? "sm" : "default";
  const chevronSize = isBoard ? "icon-sm" : "icon";
  // Outline groups use muted input dividers; filled primary groups keep bg-primary/72 default.
  const separatorClassName = isBoard ? "bg-input" : undefined;

  return (
    <Group
      aria-label="Item actions"
      className={cn("items-stretch", isBoard && "mt-2.5 w-full", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {primary ? (
        <ApplicationPrimaryActionButton
          app={app}
          layout={isBoard ? "card" : "inline"}
          grouped
          buttonVariant={buttonVariant}
          className={isBoard ? "min-w-0 flex-1" : "min-w-0"}
        />
      ) : null}
      {primary ? <GroupSeparator className={separatorClassName} /> : null}
      {showEdit ? (
        <>
          <Button
            type="button"
            size={segmentSize}
            variant={buttonVariant}
            className="shrink-0 active:scale-[0.96]"
            onClick={() => openEdit(app)}
          >
            <PencilIcon strokeWidth={1.75} aria-hidden />
            Edit
          </Button>
          <GroupSeparator className={separatorClassName} />
        </>
      ) : null}
      {showListingInGroup && listingUrl ? (
        <>
          <Button
            type="button"
            size={segmentSize}
            variant={buttonVariant}
            className="shrink-0 active:scale-[0.96]"
            render={<a href={listingUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon strokeWidth={1.75} aria-hidden />
            {APPLICATION_PRIMARY_ACTION_LABELS.openListing}
          </Button>
          <GroupSeparator className={separatorClassName} />
        </>
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size={chevronSize}
              variant={buttonVariant}
              aria-label="More actions"
              className={cn("shrink-0 active:scale-[0.96]", isBoard && "size-8 sm:size-7")}
            />
          }
        >
          <ChevronDownIcon className="size-4" strokeWidth={1.75} aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          <ApplicationItemActions
            app={app}
            slots={slots}
            density={density}
            hidePrimaryKind={hidePrimaryKind}
            hideOpenListing={hideOpenListingInMenu}
          />
        </MenuPopup>
      </Menu>
    </Group>
  );
}
