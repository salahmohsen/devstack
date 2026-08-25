"use client";

import { useRef } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";

import { useDeleteApplicationsMutation } from "@/features/applications";

type DeleteApplicationDialogProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful delete (close panel / inspect). */
  onDeleted?: (applicationId: string) => void;
};

/** Layout/page host — do not mount inside Menu/ContextMenu (unmount closes dialog). */
export function DeleteApplicationDialog({
  open,
  application,
  onOpenChange,
  onDeleted
}: DeleteApplicationDialogProps) {
  const deleteMutation = useDeleteApplicationsMutation();
  // AlertDialogAction is a Close: it fires onOpenChange(false) in the same click as
  // onConfirm, before isPending flips. Keep the host mounted until mutate settles.
  const deletingRef = useRef(false);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && deletingRef.current) return;
        onOpenChange(next);
      }}
      title="Delete this application?"
      description="This permanently removes the application from your pipeline. Prefer Close as for roles that ended — only use delete for mistakes or test data."
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmLoading={deleteMutation.isPending}
      confirmDisabled={!application}
      onConfirm={() => {
        if (!application) return;
        const applicationId = application.id;
        deletingRef.current = true;
        deleteMutation.mutate(
          { ids: [applicationId] },
          {
            onSuccess: () => {
              onDeleted?.(applicationId);
              deletingRef.current = false;
              onOpenChange(false);
            },
            onError: () => {
              deletingRef.current = false;
            }
          }
        );
      }}
    />
  );
}
