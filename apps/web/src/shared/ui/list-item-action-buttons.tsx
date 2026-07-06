"use client";

import { ChevronDown, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
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
  classNames?: classNames;
};

export function ListItemActionButtons({
  view,
  edit,
  togglePortfolio,
  delete: deleteConfig,
  classNames
}: ListItemActionButtonsProps) {
  const hasMenu = !!togglePortfolio || !!deleteConfig;
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
        {menuLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4" />
        )}
      </MenuTrigger>
      <MenuPopup align="end">
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
              <Trash2 />
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
            aria-label="View"
          >
            <ExternalLink />
            View
          </Button>
        ) : null}
        {edit ? (
          <Button
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              edit.onAction();
            }}
            loading={edit.isLoading}
            variant="outline"
            aria-label="Edit"
          >
            <Edit />
            Edit
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
        aria-label="View"
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
        aria-label="Edit"
      >
        <Edit />
      </Button>
    );
  }

  return menuContent;
}
