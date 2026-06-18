import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

type ItemsInfoSheetProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: T | null;
  /** Accessible title for the dialog (required by Radix). */
  title: string;
  /** Accessible description for the dialog. */
  description?: string;
  children: (item: T) => React.ReactNode;
};

/**
 * Mobile fallback for the side panel: a centered dialog.
 *
 * Mounted unconditionally by the page so the dialog animation runs
 * cleanly on enter/exit. `open` controls visibility.
 *
 * Mirrors the cilas `CourseInfoModal` pattern; swap to <Sheet side="bottom">
 * if a bottom drawer is preferred.
 */
export function ItemsInfoSheet<T>({
  open,
  onOpenChange,
  item,
  title,
  description,
  children
}: ItemsInfoSheetProps<T>) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="sr-only">{description}</DialogDescription>
        ) : null}
        <div className="max-h-[inherit] overflow-y-auto">
          {mounted && item ? children(item) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
