"use client";

import { FilePenLineIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";

import { useIsClient, useMediaQuery } from "@/shared/lib/use-media-query";

import { ItemInfoPanel } from "@/widgets/items-page";
import { SidePanelPortal } from "@/widgets/layout";

type EntityFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, all dismiss paths confirm before discard. */
  isDirty?: boolean;
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  /** Header actions (Save). There is no Cancel/Save footer. */
  actions?: ReactNode;
  children: ReactNode;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  className?: string;
};

/**
 * Dashboard entity create/edit: ItemInfoPanel chrome in the side panel on
 * desktop, inset Sheet on mobile. Save lives in the header; the footer is
 * prev/next + timestamps — not dialog Cancel/Save.
 */
export function EntityFormSheet({
  open,
  onOpenChange,
  isDirty = false,
  title,
  description,
  eyebrow,
  actions,
  children,
  updatedAt,
  createdAt,
  className
}: EntityFormSheetProps) {
  const ready = useIsClient();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const [showAlert, setShowAlert] = useState(false);
  const useSheet = ready && !isXl;

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowAlert(true);
      return;
    }
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      requestClose();
    },
    [onOpenChange, requestClose]
  );

  const confirmDiscard = useCallback(() => {
    setShowAlert(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || useSheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, useSheet, requestClose]);

  const chrome = (
    <ItemInfoPanel
      title={title}
      description={description}
      eyebrow={eyebrow ?? <FilePenLineIcon strokeWidth={1.75} />}
      actions={actions}
      updatedAt={updatedAt}
      createdAt={createdAt}
      headerClassName={useSheet ? "pe-12" : undefined}
      className={className}
    >
      {children}
    </ItemInfoPanel>
  );

  const dirtyAlert = (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!open) return dirtyAlert;

  if (useSheet) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetPopup className="w-full sm:max-w-lg" side="right" showCloseButton variant="inset">
            <SheetTitle className="sr-only">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="sr-only">{description}</SheetDescription>
            ) : null}
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {chrome}
            </div>
          </SheetPopup>
        </Sheet>
        {dirtyAlert}
      </>
    );
  }

  return (
    <>
      <SidePanelPortal>{chrome}</SidePanelPortal>
      {dirtyAlert}
    </>
  );
}

export function useEntityFormSheetClose(isDirty: boolean, onOpenChange: (open: boolean) => void) {
  const [showAlert, setShowAlert] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowAlert(true);
      return;
    }
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  return { requestClose, showAlert, setShowAlert } as const;
}

export { EntityFormSheet as EntityFormPanel };
