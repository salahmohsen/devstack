"use client";

import { type ApplicationOutput } from "@tsu-stack/core";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";

import { useSendOutreachMutation } from "@/features/applications";

type SendOutreachDialogProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
};

export function SendOutreachDialog({ open, application, onOpenChange }: SendOutreachDialogProps) {
  const sendMutation = useSendOutreachMutation();

  const toRaw = application?.recruiterEmail?.trim();
  const subjectRaw = application?.outreachSubject?.trim();
  const toLabel = toRaw != null && toRaw.length > 0 ? toRaw : "—";
  const subjectLabel = subjectRaw != null && subjectRaw.length > 0 ? subjectRaw : "—";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send outreach email?"
      description="Confirm the message before sending. Resume and cover letter PDFs will be attached."
      confirmLabel="Send outreach"
      confirmLoading={sendMutation.isPending}
      confirmDisabled={!application}
      onConfirm={() => {
        if (!application) return;
        sendMutation.mutate(
          { applicationId: application.id },
          {
            onSuccess: () => onOpenChange(false)
          }
        );
      }}
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
        <span className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          To
        </span>
        <span className="min-w-0 break-all text-foreground">{toLabel}</span>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
        <span className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Subject
        </span>
        <span className="min-w-0 text-foreground">{subjectLabel}</span>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
        <span className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Attachment
        </span>
        <span className="text-foreground">Resume and cover letter PDFs will be attached</span>
      </div>
    </ConfirmDialog>
  );
}
