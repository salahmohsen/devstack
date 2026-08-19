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

export type ListItemMenuItemProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  className?: string;
};

export type ListItemMenuSlots = {
  Item: ComponentType<ListItemMenuItemProps>;
  Separator: ComponentType;
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<{ children: ReactNode }>;
  SubPopup: ComponentType<{ children: ReactNode }>;
};

type MenuSlotOptions = {
  stopPropagation?: boolean;
};

export function createListItemMenuSlots(options: MenuSlotOptions = {}): ListItemMenuSlots {
  const { stopPropagation = false } = options;
  return {
    Item: ({ children, onClick, disabled, variant, className }) => (
      <MenuItem
        className={className}
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

export function createListItemContextSlots(): ListItemMenuSlots {
  return {
    Item: ({ children, onClick, disabled, variant, className }) => (
      <ContextMenuItem
        className={className}
        onClick={onClick}
        disabled={disabled}
        variant={variant}
      >
        {children}
      </ContextMenuItem>
    ),
    Separator: () => <ContextMenuSeparator />,
    Sub: ({ children }) => <ContextMenuSub>{children}</ContextMenuSub>,
    SubTrigger: ({ children }) => <ContextMenuSubTrigger>{children}</ContextMenuSubTrigger>,
    SubPopup: ({ children }) => <ContextMenuSubPopup>{children}</ContextMenuSubPopup>
  };
}

export const listItemMenuSlots = createListItemMenuSlots({ stopPropagation: true });
export const listItemContextSlots = createListItemContextSlots();
