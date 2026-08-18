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
   * - `board`: [Magic | Open listing icon? | ▾]
   * - `list`: [Magic | Open listing? | ▾] — no Edit
   * - `panel`: [Magic | Edit | Open listing? | ▾]
   * All use bordered `outline` segments (coss outline group).
   */
  variant: "board" | "list" | "panel";
  className?: string;
};

/**
 * coss Group for tracked-jobs magic CTA + overflow chevron.
 * All surfaces share the bordered `outline` button variant.
 */
export function ApplicationActionGroup({ app, variant, className }: ApplicationActionGroupProps) {
  const { openEdit } = useApplicationStore();
  const primary = getApplicationPrimaryAction(app);
  const listingUrl = listingUrlFor(app);
  const isBoard = variant === "board";
  const showEdit = variant === "panel";
  const slots = isBoard ? applicationMenuSlots : applicationListMenuSlots;
  // Skip Edit in the menu only when Edit is already a Group segment (panel).
  const density = showEdit ? "list-overflow" : "full";
  /** Listing segment unless magic CTA is already Open listing. */
  const showListingInGroup = Boolean(listingUrl) && primary?.kind !== "open-listing";
  const hidePrimaryKind = primary?.kind ?? null;
  const hideOpenListingInMenu = showListingInGroup || hidePrimaryKind === "open-listing";

  const segmentSize = isBoard ? "sm" : "default";
  const chevronSize = isBoard ? "icon-sm" : "icon";

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
          buttonVariant="outline"
          className={isBoard ? "min-w-0 flex-1" : "min-w-0"}
        />
      ) : null}
      {primary ? <GroupSeparator /> : null}
      {showEdit ? (
        <>
          <Button
            type="button"
            size={segmentSize}
            variant="outline"
            className="shrink-0 active:scale-[0.96]"
            onClick={() => openEdit(app)}
          >
            <PencilIcon strokeWidth={1.75} aria-hidden />
            Edit
          </Button>
          <GroupSeparator />
        </>
      ) : null}
      {showListingInGroup && listingUrl ? (
        <>
          <Button
            type="button"
            size={isBoard ? chevronSize : segmentSize}
            variant="outline"
            className={cn(
              "shrink-0 active:scale-[0.96]",
              // Board: icon-only next to magic CTA to save width (better-ui optical density).
              isBoard && "size-8 sm:size-7"
            )}
            aria-label={APPLICATION_PRIMARY_ACTION_LABELS.openListing}
            render={<a href={listingUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon strokeWidth={1.75} aria-hidden />
            {isBoard ? null : APPLICATION_PRIMARY_ACTION_LABELS.openListing}
          </Button>
          <GroupSeparator />
        </>
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size={chevronSize}
              variant="outline"
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
