"use client";

import { type ApplicationOutput } from "@tsu-stack/core";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";

import { useDeleteApplicationsMutation } from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

type DeleteApplicationDialogProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
};

/** Page-level host — do not mount inside Menu/ContextMenu (unmount closes dialog). */
export function DeleteApplicationDialog({
  open,
  application,
  onOpenChange
}: DeleteApplicationDialogProps) {
  const deleteMutation = useDeleteApplicationsMutation();
  const { viewItem, closeView } = useApplicationStore();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this application?"
      description="This permanently removes the application from your pipeline. Prefer Close as for roles that ended — only use delete for mistakes or test data."
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmLoading={deleteMutation.isPending}
      confirmDisabled={!application}
      onConfirm={() => {
        if (!application) return;
        deleteMutation.mutate(
          { ids: [application.id] },
          {
            onSuccess: () => {
              onOpenChange(false);
              if (viewItem?.id === application.id) closeView();
            }
          }
        );
      }}
    />
  );
}
