"use client";

import { Check, ChevronDown, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconMorph, IconShake } from "@tsu-stack/ui/components/icon-motion";
import { IconSwap } from "@tsu-stack/ui/components/icon-swap";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { Switch } from "@tsu-stack/ui/components/switch";

type ActionButtonConfig = {
  onAction: () => void;
  isLoading?: boolean;
  /** Visible label (default: View / Edit). */
  label?: string;
  /** Accessible name when it differs from the label. */
  ariaLabel?: string;
};

type TogglePortfolioConfig = {
  onAction: () => void;
  isLoading?: boolean;
  initialValue: boolean;
};

type classNames = {
  wrapper?: string;
  trigger?: string;
};

type ListItemActionButtonsProps = {
  view?: ActionButtonConfig;
  edit?: ActionButtonConfig;
  togglePortfolio?: TogglePortfolioConfig;
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
  delete: deleteConfig,
  extraMenuItems,
  classNames
}: ListItemActionButtonsProps) {
  const hasMenu = !!togglePortfolio || !!deleteConfig || !!extraMenuItems;
  const menuLoading = togglePortfolio?.isLoading ?? deleteConfig?.isLoading;

  if (!view && !edit && !hasMenu) {
    return null;
  }

  const menuContent = (
    <Menu>
      <MenuTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            disabled={menuLoading}
            onClick={(e) => e.stopPropagation()}
            aria-label="More actions"
            className={classNames?.trigger}
          />
        }
      >
        <IconSwap
          state={menuLoading ? "b" : "a"}
          aria-hidden
          iconA={<ChevronDown className="size-4" />}
          iconB={<Loader2 className="size-4 animate-spin" />}
        />
      </MenuTrigger>
      <MenuPopup align="end">
        {extraMenuItems}
        {togglePortfolio ? (
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
        ) : null}
        {deleteConfig ? (
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

  if ((view || edit) && hasMenu) {
    return (
      <Group aria-label="Item actions" className={classNames?.wrapper}>
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
        {view || edit ? <GroupSeparator /> : null}
        {menuContent}
      </Group>
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
