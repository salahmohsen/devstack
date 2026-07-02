"use client";

import { type AnyFormApi } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";
import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Guards a form's close action with an unsaved-changes confirmation dialog.
 *
 * Usage in a form component:
 *
 *   const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, onClose);
 *
 *   // Cancel button:
 *   <Button onClick={handleCloseAttempt}>Cancel</Button>
 *
 *   // At the bottom of the form component:
 *   {alertDialog}
 */
export function useFormDirtyGuard(form: AnyFormApi, onClose?: () => void) {
  const [showAlert, setShowAlert] = useState(false);

  const isDirtyRef = useRef(false);
  const isDirty = useSelector(form.store, (state) => state.isDirty && state.isTouched);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleCloseAttempt = useCallback(() => {
    if (isDirtyRef.current) {
      setShowAlert(true);
    } else {
      onClose?.();
    }
  }, [onClose]);

  const confirmClose = useCallback(() => {
    setShowAlert(false);
    onClose?.();
  }, [onClose]);

  const alertDialog = (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="overflow-hidden rounded-sm bg-surface-1 p-0">
        <AlertDialogHeader className="p-6">
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="bg-surface-2 p-3">
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { alertDialog, handleCloseAttempt } as const;
}
