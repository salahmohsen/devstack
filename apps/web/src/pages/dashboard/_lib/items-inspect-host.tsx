"use client";

import { useCallback } from "react";

import { useIsClient, useMediaQuery } from "@/shared/lib/use-media-query";

import { ItemsInfoSheet } from "@/widgets/items-page";
import { ItemsInfoPanel, useSidePanelClose } from "@/widgets/layout";

type ItemsInspectHostProps<T> = {
  open: boolean;
  item: T | null;
  children: (item: T) => React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
};

/**
 * Item inspect: desktop side panel, mobile inset Sheet.
 */
export function ItemsInspectHost<T>({
  open,
  item,
  children,
  onOpenChange,
  title = "Details",
  description
}: ItemsInspectHostProps<T>) {
  const ready = useIsClient();
  const isXl = useMediaQuery("(min-width: 1280px)");
  useSidePanelClose(
    useCallback(() => {
      onOpenChange?.(false);
    }, [onOpenChange])
  );

  if (!open || !item) return null;

  if (ready && !isXl) {
    return (
      <ItemsInfoSheet
        open={open}
        onOpenChange={onOpenChange ?? (() => {})}
        item={item}
        title={title}
        description={description}
      >
        {children}
      </ItemsInfoSheet>
    );
  }

  return (
    <ItemsInfoPanel open={open} item={item}>
      {children}
    </ItemsInfoPanel>
  );
}
