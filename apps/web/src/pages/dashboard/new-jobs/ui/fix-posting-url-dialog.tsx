"use client";

import { useState } from "react";

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
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && application ? (
        <FixPostingUrlDialogBody
          key={application.id}
          application={application}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}

function FixPostingUrlDialogBody({
  application,
  onOpenChange
}: {
  application: ApplicationOutput;
  onOpenChange: (open: boolean) => void;
}) {
  const refresh = useRefreshFromListingUrlMutation();
  const [url, setUrl] = useState(() => application.url ?? application.applyUrl ?? "");

  const canSubmit = Boolean(url.trim().length > 8 && !refresh.isPending);

  return (
    <DialogPopup
      className="flex w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      bottomStickOnMobile={false}
      showCloseButton
    >
      <DialogHeader className="shrink-0 border-b px-5 py-4">
        <DialogTitle>Fix posting URL</DialogTitle>
        <DialogDescription>
          {`${application.title} · ${application.companyName}`} We fetch the page and re-run AI
          extract for title, company, and description in the background — you can keep browsing.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 px-5 py-4">
        <Label htmlFor="fix-posting-url">Posting URL</Label>
        <Input
          id="fix-posting-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={refresh.isPending}
          aria-label="Posting URL"
        />
      </div>
      <DialogFooter className="shrink-0 border-t px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={refresh.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          loading={refresh.isPending}
          disabled={!canSubmit}
          onClick={() => {
            void refresh.mutateAsync({
              id: application.id,
              url: url.trim(),
              title: application.title,
              companyName: application.companyName
            });
            // Close immediately — progress lives in the sticky toast.
            onOpenChange(false);
          }}
        >
          Fetch job details
        </Button>
      </DialogFooter>
    </DialogPopup>
  );
}
