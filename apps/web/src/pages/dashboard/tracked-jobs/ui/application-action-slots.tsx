"use client";

import { type ComponentType, type ReactNode } from "react";

import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger
} from "@tsu-stack/ui/components/context-menu";
import {
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger
} from "@tsu-stack/ui/components/menu";

export type ApplicationActionItemProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  className?: string;
};

/** Item + Separator only (e.g. apply-package menu block). */
export type ApplicationActionMenuSlots = {
  Item: ComponentType<ApplicationActionItemProps>;
  Separator: ComponentType;
};

/** Full menu surface: item, separator, and submenus. */
export type ApplicationActionSlots = ApplicationActionMenuSlots & {
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<{ children: ReactNode }>;
  SubPopup: ComponentType<{ children: ReactNode }>;
};

type MenuSlotOptions = {
  /** Stop click bubbling (list row ⋮ menu sits on a selectable ListItem). */
  stopPropagation?: boolean;
};

/**
 * coss Menu adapters for board card ⋮ and list row ⋮.
 * One definition — do not re-declare MenuItem/Sub wrappers per call site.
 */
export function createApplicationMenuSlots(options: MenuSlotOptions = {}): ApplicationActionSlots {
  const { stopPropagation = false } = options;
  return {
    Item: ({ children, onClick, disabled, variant }) => (
      <MenuItem
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          onClick?.();
        }}
        disabled={disabled}
        variant={variant}
      >
        {children}
      </MenuItem>
    ),
    Separator: () => <MenuSeparator />,
    Sub: ({ children }) => <MenuSub>{children}</MenuSub>,
    SubTrigger: ({ children }) => <MenuSubTrigger>{children}</MenuSubTrigger>,
    SubPopup: ({ children }) => <MenuSubPopup>{children}</MenuSubPopup>
  };
}

/**
 * coss ContextMenu adapters for board card and list row right-click.
 */
export function createApplicationContextSlots(): ApplicationActionSlots {
  return {
    Item: ({ children, onClick, disabled, variant }) => (
      <ContextMenuItem onClick={onClick} disabled={disabled} variant={variant}>
        {children}
      </ContextMenuItem>
    ),
    Separator: () => <ContextMenuSeparator />,
    Sub: ({ children }) => <ContextMenuSub>{children}</ContextMenuSub>,
    SubTrigger: ({ children }) => <ContextMenuSubTrigger>{children}</ContextMenuSubTrigger>,
    SubPopup: ({ children }) => <ContextMenuSubPopup>{children}</ContextMenuSubPopup>
  };
}

/** Board card ⋮ menu + default Menu usage. */
export const applicationMenuSlots = createApplicationMenuSlots();

/** List row ⋮ menu (clicks must not select the row). */
export const applicationListMenuSlots = createApplicationMenuSlots({ stopPropagation: true });

/** Board + list right-click menus. */
export const applicationContextSlots = createApplicationContextSlots();
