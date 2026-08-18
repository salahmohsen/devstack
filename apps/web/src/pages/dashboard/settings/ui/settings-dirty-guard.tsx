"use client";

import { useBlocker } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";

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
    <ConfirmDialog
      open={status === "blocked"}
      onOpenChange={(open) => {
        if (!open) reset?.();
      }}
      title="Unsaved changes"
      description="You have unsaved changes. Are you sure you want to discard them?"
      cancelLabel="Keep editing"
      confirmLabel="Discard"
      onConfirm={() => {
        // Clear draft before proceed so remount/return is not dirty.
        onDiscardRef.current?.();
        proceed?.();
      }}
    />
  );

  return { alertDialog } as const;
}
