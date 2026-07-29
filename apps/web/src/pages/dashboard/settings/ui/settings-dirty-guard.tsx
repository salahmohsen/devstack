"use client";

import { useBlocker } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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

export type UseSettingsDirtyGuardOptions = {
  /**
   * Called when the user confirms leave (Discard). Use to reset drafts / exit edit
   * mode so remount or return is clean. Prefer a stable callback or accept that
   * the latest ref is always used.
   */
  onDiscard?: () => void;
};

/**
 * Blocks TanStack Router navigation (and tab close via beforeunload) while a
 * settings form is dirty. Renders the same AlertDialog pattern as entity forms.
 *
 * Usage:
 *   const leaveGuard = useSettingsDirtyGuard(dirty, { onDiscard: discard });
 *   // …
 *   {leaveGuard.alertDialog}
 */
export function useSettingsDirtyGuard(dirty: boolean, options?: UseSettingsDirtyGuardOptions) {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const onDiscardRef = useRef(options?.onDiscard);
  useEffect(() => {
    onDiscardRef.current = options?.onDiscard;
  }, [options?.onDiscard]);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
    enableBeforeUnload: dirty
  });

  const alertDialog = (
    <AlertDialog
      open={status === "blocked"}
      onOpenChange={(open) => {
        if (!open) reset?.();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              reset?.();
            }}
          >
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              // Clear draft before proceed so remount/return is not dirty.
              onDiscardRef.current?.();
              proceed?.();
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { alertDialog } as const;
}
