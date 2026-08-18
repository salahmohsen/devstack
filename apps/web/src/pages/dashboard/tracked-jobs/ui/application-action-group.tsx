"use client";

import { ChevronDownIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { getApplicationPrimaryAction, listingUrlFor } from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  ApplicationItemActions,
  applicationListMenuSlots,
  applicationMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";
import { ApplicationPrimaryActionButton } from "@/pages/dashboard/tracked-jobs/ui/application-primary-action-button";

export type ApplicationActionGroupProps = {
  app: ApplicationOutput;
  /** Board: magic + chevron. with-edit: magic + Edit (+ listing) + chevron. */
  variant: "board" | "with-edit";
  className?: string;
};

function postingHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Structural divider between joined Group segments (better-ui: border for structure). */
function ActionGroupSeparator() {
  return <GroupSeparator className="bg-border" />;
}

/**
 * coss Group for tracked-jobs magic CTA + overflow chevron.
 * Hides the menu entry that matches the visible primary action.
 */
export function ApplicationActionGroup({ app, variant, className }: ApplicationActionGroupProps) {
  const { openEdit } = useApplicationStore();
  const primary = getApplicationPrimaryAction(app);
  const listingUrl = listingUrlFor(app);
  const slots = variant === "board" ? applicationMenuSlots : applicationListMenuSlots;
  const density = variant === "with-edit" ? "list-overflow" : "full";
  const isBoard = variant === "board";
  /** Listing sits in the Group on list/panel unless magic CTA is already Open listing. */
  const showListingInGroup =
    variant === "with-edit" && Boolean(listingUrl) && primary?.kind !== "open-listing";
  const hidePrimaryKind = primary?.kind ?? null;
  /** When listing is a Group segment, also omit it from the overflow menu. */
  const hideOpenListingInMenu = showListingInGroup || hidePrimaryKind === "open-listing";

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
          className={isBoard ? "min-w-0 flex-1" : "min-w-0"}
        />
      ) : null}
      {primary ? <ActionGroupSeparator /> : null}
      {variant === "with-edit" ? (
        <>
          <Button
            type="button"
            size="default"
            variant="default"
            className="shrink-0 active:scale-[0.96]"
            onClick={() => openEdit(app)}
          >
            <PencilIcon strokeWidth={1.75} aria-hidden />
            Edit
          </Button>
          <ActionGroupSeparator />
        </>
      ) : null}
      {showListingInGroup && listingUrl ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 active:scale-[0.96]"
            render={
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open job posting (${postingHost(listingUrl)})`}
              />
            }
          >
            <ExternalLinkIcon strokeWidth={1.75} aria-hidden />
          </Button>
          <ActionGroupSeparator />
        </>
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size={isBoard ? "icon-sm" : "icon"}
              variant="outline"
              aria-label="More actions"
              className={cn("shrink-0", isBoard && "size-8 sm:size-7")}
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
