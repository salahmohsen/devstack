"use client";

import { ChevronDownIcon, PencilIcon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { getApplicationPrimaryAction } from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  ApplicationItemActions,
  applicationListMenuSlots,
  applicationMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";
import { ApplicationPrimaryActionButton } from "@/pages/dashboard/tracked-jobs/ui/application-primary-action-button";

export type ApplicationActionGroupProps = {
  app: ApplicationOutput;
  /** Board: magic + chevron. with-edit: magic + Edit + chevron (list / side panel). */
  variant: "board" | "with-edit";
  className?: string;
};

/**
 * coss Group for tracked-jobs magic CTA + overflow chevron.
 * Hides the menu entry that matches the visible primary action.
 */
export function ApplicationActionGroup({ app, variant, className }: ApplicationActionGroupProps) {
  const { openEdit } = useApplicationStore();
  const primary = getApplicationPrimaryAction(app);
  const slots = variant === "board" ? applicationMenuSlots : applicationListMenuSlots;
  const density = variant === "with-edit" ? "list-overflow" : "full";
  const buttonSize = variant === "board" ? "sm" : "default";

  return (
    <Group
      aria-label="Item actions"
      className={cn(variant === "board" && "mt-2.5 w-full", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {primary ? (
        <ApplicationPrimaryActionButton
          app={app}
          layout={variant === "board" ? "card" : "inline"}
          grouped
          className={variant === "board" ? "min-w-0 flex-1" : "min-w-0"}
        />
      ) : null}
      {primary ? <GroupSeparator /> : null}
      {variant === "with-edit" ? (
        <>
          <Button
            type="button"
            size={buttonSize}
            variant="default"
            className="shrink-0 active:scale-[0.96]"
            onClick={() => openEdit(app)}
          >
            <PencilIcon aria-hidden />
            Edit
          </Button>
          <GroupSeparator />
        </>
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="More actions"
              className="shrink-0"
            />
          }
        >
          <ChevronDownIcon className="size-4" aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          <ApplicationItemActions
            app={app}
            slots={slots}
            density={density}
            hidePrimaryKind={primary?.kind ?? null}
          />
        </MenuPopup>
      </Menu>
    </Group>
  );
}
