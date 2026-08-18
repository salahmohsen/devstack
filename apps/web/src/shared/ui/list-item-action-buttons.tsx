"use client";

import { Check, ChevronDown, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconMorph, IconShake } from "@tsu-stack/ui/components/icon-motion";
import { IconSwap } from "@tsu-stack/ui/components/icon-swap";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { StatusMorphToggle } from "@tsu-stack/ui/components/status-morph-toggle";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";

type ActionButtonConfig = {
  onAction: () => void;
  isLoading?: boolean;
  /** Visible label (default: View / Edit). */
  label?: string;
  /** Accessible name when it differs from the label. */
  ariaLabel?: string;
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
  className
}: {
  inPortfolio: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  className?: string;
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
            size="icon"
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
        <IconSwap
          state={isLoading ? "b" : "a"}
          aria-hidden
          iconA={<StatusMorphToggle active={active} size="sm" hovered={hovered} />}
          iconB={<Loader2 className="size-4 animate-spin" />}
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
  togglePortfolio?: ToggleConfig;
  toggleFeatured?: ToggleConfig;
  delete?: ActionButtonConfig;
  /**
   * Extra items rendered at the top of the overflow menu (e.g. “Detect stacks”).
   * Callers own MenuItem markup and should stopPropagation on click.
   */
  extraMenuItems?: React.ReactNode;
  classNames?: classNames;
};

export function ListItemActionButtons({
  view,
  viewSlot,
  edit,
  togglePortfolio,
  toggleFeatured,
  delete: deleteConfig,
  extraMenuItems,
  classNames
}: ListItemActionButtonsProps) {
  const hasView = viewSlot != null || view != null;
  const hasOverflowMenu = !!togglePortfolio || !!toggleFeatured || !!extraMenuItems;
  const showDeleteInGroup = !!deleteConfig && !hasOverflowMenu;
  const hasMenu = hasOverflowMenu;

  if (!hasView && !edit && !hasMenu && !showDeleteInGroup) {
    return null;
  }

  const menuContent = (
    <Menu>
      <MenuTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            onClick={(e) => e.stopPropagation()}
            aria-label="More actions"
            className={classNames?.trigger}
          />
        }
      >
        <ChevronDown className="size-4" aria-hidden />
      </MenuTrigger>
      <MenuPopup align="end">
        {/* Edit stays in the strip from md+; on mobile it lives here to save width. */}
        {edit && hasOverflowMenu ? (
          <MenuItem
            className="md:hidden"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              edit.onAction();
            }}
            disabled={edit.isLoading}
          >
            <Edit />
            {edit.label ?? "Edit"}
          </MenuItem>
        ) : null}
        {extraMenuItems}
        {togglePortfolio || toggleFeatured ? (
          toggleFeatured ? (
            <MenuSub>
              <MenuSubTrigger
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                }}
              >
                Add to
              </MenuSubTrigger>
              <MenuSubPopup>
                {togglePortfolio ? (
                  <MenuItem
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      togglePortfolio.onAction();
                    }}
                    disabled={togglePortfolio.isLoading}
                  >
                    <span className="flex-1">Portfolio</span>
                    <Switch
                      checked={togglePortfolio.initialValue}
                      className="pointer-events-none"
                    />
                  </MenuItem>
                ) : null}
                <MenuItem
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    toggleFeatured.onAction();
                  }}
                  disabled={toggleFeatured.isLoading}
                >
                  <span className="flex-1">Featured</span>
                  <Switch checked={toggleFeatured.initialValue} className="pointer-events-none" />
                </MenuItem>
              </MenuSubPopup>
            </MenuSub>
          ) : togglePortfolio ? (
            <MenuItem
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                togglePortfolio.onAction();
              }}
              disabled={togglePortfolio.isLoading}
            >
              <span className="flex-1">In portfolio</span>
              <Switch checked={togglePortfolio.initialValue} className="pointer-events-none" />
            </MenuItem>
          ) : null
        ) : null}
        {deleteConfig && !showDeleteInGroup ? (
          <>
            <MenuSeparator />
            <MenuItem
              variant="destructive"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                deleteConfig.onAction();
              }}
              disabled={deleteConfig.isLoading}
            >
              <IconShake mode="hover">
                <Trash2 className="text-destructive" />
              </IconShake>
              Delete
            </MenuItem>
          </>
        ) : null}
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
    (hasView || edit || showDeleteInGroup) &&
    (hasMenu || showDeleteInGroup || (hasView && edit))
  ) {
    return (
      <Group aria-label="Item actions" className={classNames?.wrapper}>
        {togglePortfolio ? (
          <>
            <PortfolioStatusButton
              inPortfolio={togglePortfolio.initialValue}
              isLoading={togglePortfolio.isLoading}
              onToggle={togglePortfolio.onAction}
              className={classNames?.trigger}
            />
            <GroupSeparator />
          </>
        ) : null}
        {viewControl}
        {hasView && edit ? (
          <GroupSeparator className={hasOverflowMenu ? "max-md:hidden" : undefined} />
        ) : null}
        {edit ? (
          <Button
            className={hasOverflowMenu ? "max-md:hidden" : undefined}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              edit.onAction();
            }}
            loading={edit.isLoading}
            variant="outline"
            aria-label={edit.ariaLabel ?? edit.label ?? "Edit"}
          >
            <IconMorph mode="hover" iconA={<Edit />} iconB={<Check className="text-success" />} />
            {edit.label ?? "Edit"}
          </Button>
        ) : null}
        {showDeleteInGroup ? (
          <>
            {hasView || edit ? <GroupSeparator /> : null}
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
            {hasView || edit || showDeleteInGroup ? <GroupSeparator /> : null}
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
        size="icon"
        className={classNames?.wrapper}
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
        size="icon"
        className={classNames?.wrapper}
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
