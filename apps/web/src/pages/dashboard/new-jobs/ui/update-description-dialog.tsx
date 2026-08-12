"use client";

import { useState } from "react";
import { toast } from "sonner";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Textarea } from "@tsu-stack/ui/components/textarea";

import { useUpdateApplicationMutation } from "@/features/applications";

type UpdateDescriptionDialogProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (for follow-up toast / Track & package). */
  onSaved?: (application: ApplicationOutput) => void;
};

/** Paste or fix job description when harvest/AI left it empty or wrong. */
export function UpdateDescriptionDialog({
  open,
  application,
  onOpenChange,
  onSaved
}: UpdateDescriptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && application ? (
        <UpdateDescriptionDialogBody
          key={application.id}
          application={application}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function UpdateDescriptionDialogBody({
  application,
  onOpenChange,
  onSaved
}: {
  application: ApplicationOutput;
  onOpenChange: (open: boolean) => void;
  onSaved?: (application: ApplicationOutput) => void;
}) {
  const update = useUpdateApplicationMutation();
  const [value, setValue] = useState(() => application.description ?? "");

  const canSave = Boolean(value.trim().length > 0 && !update.isPending);
  const wasEmpty = !application.description?.trim();

  return (
    <DialogPopup
      className="flex max-h-[min(90dvh,36rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      bottomStickOnMobile={false}
      showCloseButton
    >
      <DialogHeader className="shrink-0 border-b px-5 py-4">
        <DialogTitle>{wasEmpty ? "Add job description" : "Update job description"}</DialogTitle>
        <DialogDescription>{`${application.title} · ${application.companyName}`}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 px-5 py-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste the full job description here…"
          className="min-h-56 w-full"
          size="lg"
          aria-label="Job description"
          disabled={update.isPending}
        />
      </div>
      <DialogFooter className="shrink-0 border-t px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={update.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          loading={update.isPending}
          disabled={!canSave}
          onClick={() => {
            void update
              .mutateAsync({
                id: application.id,
                data: { description: value.trim() }
              })
              .then((updated) => {
                onOpenChange(false);
                if (onSaved) {
                  onSaved(updated);
                } else {
                  // Mutation skips description-only toast so this dialog owns copy.
                  toast.success("Description saved");
                }
              });
          }}
        >
          Save description
        </Button>
      </DialogFooter>
    </DialogPopup>
  );
}
