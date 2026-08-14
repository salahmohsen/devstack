"use client";

import { Check, ChevronDown, Circle, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";

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
import { Switch } from "@tsu-stack/ui/components/switch";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

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

function LiveStatusDot({ live }: { live: boolean }) {
  return (
    <Circle
      className={cn(
        "size-2 opacity-100",
        live ? "fill-success text-success" : "fill-destructive text-destructive"
      )}
    />
  );
}

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
  const hint = inPortfolio ? "On your public profile" : "Not on your public profile";

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
              onToggle();
            }}
            aria-label={hint}
            aria-pressed={inPortfolio}
            data-slot="button"
            className={className}
          />
        }
      >
        <IconSwap
          state={isLoading ? "b" : "a"}
          aria-hidden
          iconA={<LiveStatusDot live={inPortfolio} />}
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
  edit,
  togglePortfolio,
  toggleFeatured,
  delete: deleteConfig,
  extraMenuItems,
  classNames
}: ListItemActionButtonsProps) {
  const hasOverflowMenu = !!togglePortfolio || !!toggleFeatured || !!extraMenuItems;
  const showDeleteInGroup = !!deleteConfig && !hasOverflowMenu;
  const hasMenu = hasOverflowMenu;

  if (!view && !edit && !hasMenu && !showDeleteInGroup) {
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

  if ((view || edit || showDeleteInGroup) && (hasMenu || showDeleteInGroup || (view && edit))) {
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
        {view ? (
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
        ) : null}
        {view && edit ? <GroupSeparator /> : null}
        {edit ? (
          <Button
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
            {view || edit ? <GroupSeparator /> : null}
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
            {view || edit || showDeleteInGroup ? <GroupSeparator /> : null}
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
