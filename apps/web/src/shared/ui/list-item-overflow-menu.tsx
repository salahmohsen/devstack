"use client";

import { Edit, ExternalLink, SquareCheckIcon, SquareIcon, Trash2 } from "lucide-react";

import { IconShake } from "@tsu-stack/ui/components/icon-motion";
import { Switch } from "@tsu-stack/ui/components/switch";

import { type ListItemMenuSlots } from "@/shared/ui/list-item-menu-slots";

type ActionConfig = {
  onAction: () => void;
  isLoading?: boolean;
  label?: string;
};

type ToggleConfig = {
  onAction: () => void;
  isLoading?: boolean;
  initialValue: boolean;
};

export type ListItemOverflowMenuProps = {
  slots: ListItemMenuSlots;
  /** Batch select — shown in ▾ and right-click menus. */
  select?: {
    selected: boolean;
    onToggle: () => void;
  };
  /**
   * Include View in this menu (context menu). Omit from ▾ when View is already a strip button.
   */
  view?: ActionConfig;
  /**
   * Include Edit. For ▾ menus that also show Edit in the strip, pass `editClassName="md:hidden"`.
   */
  edit?: ActionConfig;
  editClassName?: string;
  togglePortfolio?: ToggleConfig;
  toggleFeatured?: ToggleConfig;
  delete?: ActionConfig;
  renderExtraMenuItems?: (slots: ListItemMenuSlots) => React.ReactNode;
};

/**
 * Shared overflow items for list-row ▾ menus and right-click context menus.
 * Select is always first when provided.
 */
export function ListItemOverflowMenu({
  slots,
  select,
  view,
  edit,
  editClassName,
  togglePortfolio,
  toggleFeatured,
  delete: deleteConfig,
  renderExtraMenuItems
}: ListItemOverflowMenuProps) {
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;
  const extra = renderExtraMenuItems?.(slots);
  const hasToggles = togglePortfolio != null || toggleFeatured != null;
  const hasBody =
    view != null || edit != null || extra != null || hasToggles || deleteConfig != null;

  return (
    <>
      {select ? (
        <Item onClick={select.onToggle}>
          {select.selected ? <SquareCheckIcon aria-hidden /> : <SquareIcon aria-hidden />}
          {select.selected ? "Deselect" : "Select"}
        </Item>
      ) : null}
      {select && hasBody ? <Separator /> : null}
      {view ? (
        <Item onClick={view.onAction} disabled={view.isLoading}>
          <ExternalLink aria-hidden />
          {view.label ?? "View"}
        </Item>
      ) : null}
      {edit ? (
        <Item className={editClassName} onClick={edit.onAction} disabled={edit.isLoading}>
          <Edit aria-hidden />
          {edit.label ?? "Edit"}
        </Item>
      ) : null}
      {extra}
      {hasToggles ? (
        toggleFeatured ? (
          <Sub>
            <SubTrigger>Add to</SubTrigger>
            <SubPopup>
              {togglePortfolio ? (
                <Item onClick={togglePortfolio.onAction} disabled={togglePortfolio.isLoading}>
                  <span className="flex-1">Portfolio</span>
                  <Switch checked={togglePortfolio.initialValue} className="pointer-events-none" />
                </Item>
              ) : null}
              <Item onClick={toggleFeatured.onAction} disabled={toggleFeatured.isLoading}>
                <span className="flex-1">Featured</span>
                <Switch checked={toggleFeatured.initialValue} className="pointer-events-none" />
              </Item>
            </SubPopup>
          </Sub>
        ) : togglePortfolio ? (
          <Item onClick={togglePortfolio.onAction} disabled={togglePortfolio.isLoading}>
            <span className="flex-1">In portfolio</span>
            <Switch checked={togglePortfolio.initialValue} className="pointer-events-none" />
          </Item>
        ) : null
      ) : null}
      {deleteConfig ? (
        <>
          {view || edit || extra || hasToggles || select ? <Separator /> : null}
          <Item
            variant="destructive"
            onClick={deleteConfig.onAction}
            disabled={deleteConfig.isLoading}
          >
            <IconShake mode="hover">
              <Trash2 className="text-destructive" />
            </IconShake>
            {deleteConfig.label ?? "Delete"}
          </Item>
        </>
      ) : null}
    </>
  );
}
