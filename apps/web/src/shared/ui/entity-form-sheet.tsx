"use client";

import { type ReactNode, useCallback, useState } from "react";

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
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";
import { cn } from "@tsu-stack/ui/lib/utils";

type EntityFormSheetFooterApi = {
  /** Closes the sheet with dirty confirmation when needed. Use for Cancel. */
  requestClose: () => void;
};

type EntityFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, all dismiss paths (backdrop, Escape, X, Cancel via requestClose) confirm first. */
  isDirty?: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode | ((api: EntityFormSheetFooterApi) => ReactNode);
  className?: string;
};

/**
 * Shared right Sheet shell for dashboard entity create/edit (ADR-0025).
 * Intercepts every close path when `isDirty` so forms cannot silent-discard.
 */
export function EntityFormSheet({
  open,
  onOpenChange,
  isDirty = false,
  title,
  description,
  children,
  footer,
  className
}: EntityFormSheetProps) {
  const [showAlert, setShowAlert] = useState(false);

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

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetPopup
          className={cn("w-full max-w-lg sm:max-w-lg", className)}
          side="right"
          showCloseButton
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <SheetPanel className="min-h-0 flex-1">{children}</SheetPanel>
          <SheetFooter>
            {typeof footer === "function" ? footer({ requestClose }) : footer}
          </SheetFooter>
        </SheetPopup>
      </Sheet>

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
    </>
  );
}

/** Call from Cancel / footer actions so dirty confirm matches Sheet dismiss. */
export function useEntityFormSheetClose(isDirty: boolean, onOpenChange: (open: boolean) => void) {
  const [showAlert, setShowAlert] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowAlert(true);
      return;
    }
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  // Prefer EntityFormSheet's built-in isDirty; this helper is for Cancel buttons
  // that must not rely only on Dialog-style Cancel wiring.
  return { requestClose, showAlert, setShowAlert } as const;
}
