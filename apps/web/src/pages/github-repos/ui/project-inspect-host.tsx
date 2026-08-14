"use client";

import { useIsClient, useMediaQuery } from "@/shared/lib/use-media-query";

import { ItemsInfoSheet } from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

type ProjectInspectHostProps<T> = {
  open: boolean;
  item: T | null;
  children: (item: T) => React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
};

/** Public repos list: desktop side panel, mobile inset Sheet. */
export function ProjectInspectHost<T>({
  open,
  item,
  children,
  onOpenChange,
  title = "Project",
  description
}: ProjectInspectHostProps<T>) {
  const ready = useIsClient();
  const isXl = useMediaQuery("(min-width: 1280px)");

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
