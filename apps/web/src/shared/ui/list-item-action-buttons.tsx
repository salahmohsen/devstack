"use client";

import { Check, ChevronDown, Edit, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { StatusMorphToggle } from "@tsu-stack/ui/components/status-morph-toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { listItemMenuSlots, type ListItemMenuSlots } from "@/shared/ui/list-item-menu-slots";
import { ListItemOverflowMenu } from "@/shared/ui/list-item-overflow-menu";

type ActionButtonConfig = {
  onAction: () => void;
  isLoading?: boolean;
  /** Visible label (default: View / Edit). */
  label?: string;
  /** Accessible name when it differs from the label. */
  ariaLabel?: string;
  /** Strip control as icon-only; label/aria still used for accessibility. */
  iconOnly?: boolean;
};

type ToggleConfig = {
  onAction: () => void;
  isLoading?: boolean;
  initialValue: boolean;
};

function PortfolioStatusButton({
  inPortfolio,
  isLoading,
  onToggle,
  className,
  size = "icon"
}: {
  inPortfolio: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  className?: string;
  size?: "icon" | "icon-sm";
}) {
  const [active, setActive] = useState(inPortfolio);
  const [prevInPortfolio, setPrevInPortfolio] = useState(inPortfolio);
  const [hovered, setHovered] = useState(false);

  if (prevInPortfolio !== inPortfolio) {
    setPrevInPortfolio(inPortfolio);
    setActive(inPortfolio);
  }

  const hint = active ? "On your public profile" : "Not on your public profile";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size={size}
            variant="outline"
            disabled={isLoading}
            onClick={(event) => {
              event.stopPropagation();
              setActive((value) => !value);
              onToggle();
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label={hint}
            aria-pressed={active}
            data-slot="button"
            className={className}
          />
        }
      >
        <StatusMorphToggle
          active={active}
          size="sm"
          hovered={hovered}
          pending={Boolean(isLoading)}
        />
      </TooltipTrigger>
      <TooltipPopup>{hint}</TooltipPopup>
    </Tooltip>
  );
}

type classNames = {
  wrapper?: string;
  trigger?: string;
};

type ListItemActionButtonsProps = {
  view?: ActionButtonConfig;
  /**
   * Custom control replacing the default View / Open listing button
   * (e.g. tracked-jobs smart Prepare / Review / Send CTA).
   */
  viewSlot?: React.ReactNode;
  edit?: ActionButtonConfig;
  /**
   * Keep Edit in the overflow menu only (no strip button).
   * Use on compact cards where the strip is toggle + ▾.
   */
  editInMenu?: boolean;
  togglePortfolio?: ToggleConfig;
  toggleFeatured?: ToggleConfig;
  delete?: ActionButtonConfig;
  /** Batch select — adds Select/Deselect to the ▾ menu (and implies a ▾ exists). */
  select?: {
    selected: boolean;
    onToggle: () => void;
  };
  /**
   * Extra overflow items for both ▾ and right-click menus (slot-based).
   * Prefer this over `extraMenuItems` so context menus stay in sync.
   */
  renderExtraMenuItems?: (slots: ListItemMenuSlots) => React.ReactNode;
  /**
   * @deprecated Menu-only extras. Prefer `renderExtraMenuItems` for context-menu parity.
   */
  extraMenuItems?: React.ReactNode;
  classNames?: classNames;
  /** Icon-sm strip (28px) for compact grid cards — matches the identity mark. */
  compact?: boolean;
};

export function ListItemActionButtons({
  view,
  viewSlot,
  edit,
  editInMenu = false,
  togglePortfolio,
  toggleFeatured,
  delete: deleteConfig,
  select,
  renderExtraMenuItems,
  extraMenuItems,
  classNames,
  compact = false
}: ListItemActionButtonsProps) {
  const iconSize = compact ? "icon-sm" : "icon";
  const iconClassName = cn(compact && "size-7", classNames?.trigger);
  const hasView = viewSlot != null || view != null;
  const hasOverflowMenu =
    !!togglePortfolio ||
    !!toggleFeatured ||
    !!extraMenuItems ||
    !!renderExtraMenuItems ||
    !!select ||
    editInMenu;
  // When a ▾ exists (including Select-only), delete lives in the menu — not as a strip button.
  const showDeleteInGroup = !!deleteConfig && !hasOverflowMenu;
  const hasMenu = hasOverflowMenu;
  const editOnStrip = Boolean(edit) && !editInMenu;
  const editInOverflow = Boolean(edit) && (hasOverflowMenu || editInMenu);

  if (!hasView && !edit && !hasMenu && !showDeleteInGroup) {
    return null;
  }

  const menuContent = (
    <Menu>
      <MenuTrigger
        render={
          <Button
            size={iconSize}
            variant="outline"
            onClick={(e) => e.stopPropagation()}
            aria-label="More actions"
            className={iconClassName}
          />
        }
      >
        <ChevronDown className="size-4" aria-hidden />
      </MenuTrigger>
      <MenuPopup align="end">
        <ListItemOverflowMenu
          slots={listItemMenuSlots}
          select={select}
          edit={editInOverflow ? edit : undefined}
          editClassName={editOnStrip && hasOverflowMenu ? "md:hidden" : undefined}
          togglePortfolio={togglePortfolio}
          toggleFeatured={toggleFeatured}
          delete={deleteConfig && !showDeleteInGroup ? deleteConfig : undefined}
          renderExtraMenuItems={
            renderExtraMenuItems ?? (extraMenuItems ? () => extraMenuItems : undefined)
          }
        />
      </MenuPopup>
    </Menu>
  );

  const defaultViewButton = view ? (
    <Button
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation();
        view.onAction();
      }}
      loading={view.isLoading}
      variant="outline"
      aria-label={view.ariaLabel ?? view.label ?? "View"}
    >
      <ExternalLink />
      {view.label ?? "View"}
    </Button>
  ) : null;
  const viewControl = viewSlot ?? defaultViewButton;

  if (
    (hasView || editOnStrip || showDeleteInGroup || Boolean(togglePortfolio)) &&
    (hasMenu || showDeleteInGroup || (hasView && editOnStrip) || Boolean(togglePortfolio))
  ) {
    return (
      <Group aria-label="Item actions" className={cn(compact && "h-7", classNames?.wrapper)}>
        {togglePortfolio ? (
          <>
            <PortfolioStatusButton
              inPortfolio={togglePortfolio.initialValue}
              isLoading={togglePortfolio.isLoading}
              onToggle={togglePortfolio.onAction}
              size={iconSize}
              className={iconClassName}
            />
            <GroupSeparator />
          </>
        ) : null}
        {viewControl}
        {hasView && editOnStrip ? (
          <GroupSeparator className={hasOverflowMenu ? "max-md:hidden" : undefined} />
        ) : null}
        {editOnStrip && edit ? (
          <Button
            size={edit.iconOnly ? "icon" : undefined}
            className={cn(hasOverflowMenu && !edit.iconOnly ? "max-md:hidden" : undefined)}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              edit.onAction();
            }}
            loading={edit.isLoading}
            variant="outline"
            aria-label={edit.ariaLabel ?? edit.label ?? "Edit"}
          >
            <IconMorph mode="hover" iconA={<Edit />} iconB={<Check className="text-success" />} />
            {edit.iconOnly ? null : (edit.label ?? "Edit")}
          </Button>
        ) : null}
        {showDeleteInGroup ? (
          <>
            {hasView || editOnStrip ? <GroupSeparator /> : null}
            <Button
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                deleteConfig.onAction();
              }}
              loading={deleteConfig.isLoading}
              variant="destructive-outline"
              aria-label={deleteConfig.ariaLabel ?? deleteConfig.label ?? "Delete"}
            >
              <Trash2 />
              {deleteConfig.label ?? "Delete"}
            </Button>
          </>
        ) : null}
        {hasMenu ? (
          <>
            {hasView || editOnStrip || showDeleteInGroup ? <GroupSeparator /> : null}
            {menuContent}
          </>
        ) : null}
      </Group>
    );
  }

  if (showDeleteInGroup && !view && !edit) {
    return (
      <Button
        className={classNames?.wrapper}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          deleteConfig.onAction();
        }}
        loading={deleteConfig.isLoading}
        variant="destructive-outline"
        aria-label={deleteConfig.ariaLabel ?? deleteConfig.label ?? "Delete"}
      >
        <Trash2 />
        {deleteConfig.label ?? "Delete"}
      </Button>
    );
  }

  if (viewSlot) {
    return <div className={classNames?.wrapper}>{viewSlot}</div>;
  }

  if (view) {
    return (
      <Button
        size={iconSize}
        className={cn(iconClassName, classNames?.wrapper)}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          view.onAction();
        }}
        loading={view.isLoading}
        aria-label={view.ariaLabel ?? view.label ?? "View"}
      >
        <ExternalLink />
      </Button>
    );
  }

  if (edit) {
    return (
      <Button
        size={iconSize}
        className={cn(iconClassName, classNames?.wrapper)}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          edit.onAction();
        }}
        loading={edit.isLoading}
        aria-label={edit.ariaLabel ?? edit.label ?? "Edit"}
      >
        <IconMorph mode="hover" iconA={<Edit />} iconB={<Check className="text-success" />} />
      </Button>
    );
  }

  return menuContent;
}
