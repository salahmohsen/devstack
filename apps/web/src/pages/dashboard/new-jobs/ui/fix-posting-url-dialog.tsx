"use client";

import { Link2Icon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { PromptDialog } from "@tsu-stack/ui/components/prompt-dialog";

import { useAppForm } from "@/shared/form";

import { useRefreshFromListingUrlMutation } from "@/features/applications";

type FixPostingUrlDialogProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Paste a working listing URL → close dialog immediately and run fetch + AI
 * extract in the background (sticky toast with live steps).
 */
export function FixPostingUrlDialog({ open, application, onOpenChange }: FixPostingUrlDialogProps) {
  if (!open || !application) return null;
  return <FixPostingUrlDialogBody application={application} onOpenChange={onOpenChange} />;
}

function FixPostingUrlDialogBody({
  application,
  onOpenChange
}: {
  application: ApplicationOutput;
  onOpenChange: (open: boolean) => void;
}) {
  const refresh = useRefreshFromListingUrlMutation();
  const form = useAppForm({
    defaultValues: { url: application.url ?? application.applyUrl ?? "" },
    onSubmit: ({ value }) => {
      const url = value.url.trim();
      if (url.length < 8) return;
      void refresh.mutateAsync({
        id: application.id,
        url,
        title: application.title,
        companyName: application.companyName
      });
      onOpenChange(false);
    }
  });

  return (
    <PromptDialog
      open
      onOpenChange={onOpenChange}
      size="md"
      title="Fix posting URL"
      description={`${application.title} · ${application.companyName}. We fetch the page and re-run extract in the background.`}
      icon={<Link2Icon className="size-4" strokeWidth={2} />}
      submitLabel="Fetch job details"
      submitLoading={refresh.isPending}
      onSubmit={() => void form.handleSubmit()}
    >
      <form.AppField name="url">
        {(field) => (
          <field.UrlField
            label="Posting URL"
            placeholder="jobs.example.com/…"
            disabled={refresh.isPending}
          />
        )}
      </form.AppField>
    </PromptDialog>
  );
}
