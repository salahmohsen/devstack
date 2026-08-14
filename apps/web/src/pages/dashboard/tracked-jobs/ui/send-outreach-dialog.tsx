"use client";

import { type ApplicationOutput } from "@tsu-stack/core";
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
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (sendMutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send outreach email?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm the message before sending. Resume PDF will be attached.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 px-6 pb-2 text-sm">
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
            <span className="text-foreground">Resume PDF will be attached</span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sendMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            loading={sendMutation.isPending}
            disabled={!application}
            onClick={() => {
              if (!application) return;
              sendMutation.mutate(
                { applicationId: application.id },
                {
                  onSuccess: () => onOpenChange(false)
                }
              );
            }}
          >
            Send outreach
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
