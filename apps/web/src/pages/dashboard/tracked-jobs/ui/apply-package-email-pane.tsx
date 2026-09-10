"use client";

import { useQuery } from "@tanstack/react-query";
import { SendIcon, TriangleAlertIcon } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { cn } from "@tsu-stack/ui/lib/utils";

import { OutboundMailPreview } from "@/shared/apply-mail/outbound-mail-preview";

import { getProfileQueryOptions } from "@/features/profile";

import { PaneQueryGate } from "./apply-package-pane-gate";

export type EmailAttachments = {
  resume: boolean;
  cover: boolean;
};

export type ApplyPackageEmailPaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
  /** Send-time attachment selection lives in the dialog (sidebar count uplink). */
  attachments: EmailAttachments;
  onAttachmentsChange: Dispatch<SetStateAction<EmailAttachments>>;
  /**
   * Dialog-mediated Send: saves first when the kit is stale, then sends with
   * overrides. Resolves true only when the email actually went out.
   */
  onSend: (attachments: EmailAttachments) => Promise<boolean>;
  sendPending: boolean;
  /** After a successful Send the dialog closes. */
  onSent: () => void;
};

const PDF_TILE =
  "flex h-[38px] w-[30px] shrink-0 items-center justify-center rounded-[5px] border border-red-200/90 bg-red-50 text-[8px] font-bold tracking-wide text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300";

/** Attachment square from the reference: PDF glyph tile + filename + toggle pill. */
function AttachmentCard({
  filename,
  sub,
  missing,
  checked,
  disabled,
  onToggle
}: {
  filename: string;
  sub: string;
  missing: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        missing
          ? "border-dashed border-border/70 bg-background hover:bg-muted/30"
          : "border-border bg-background hover:bg-muted/30",
        !checked && "bg-muted/20 opacity-60 hover:opacity-90"
      )}
    >
      <span className={PDF_TILE} aria-hidden>
        PDF
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{filename}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-3.75 w-6.5 shrink-0 rounded-full transition-colors",
          checked ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.75 rounded-full bg-white shadow-sm transition-all",
            checked ? "right-0.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** Email pane of the review dialog: rendered Matte mail + attachment squares + Send. */
export function ApplyPackageEmailPane({
  application,
  draft,
  onDraftChange,
  busy,
  attachments,
  onAttachmentsChange,
  onSend,
  sendPending,
  onSent
}: ApplyPackageEmailPaneProps) {
  const hasDraft = draft != null;
  const profileQuery = useQuery({ ...getProfileQueryOptions(), enabled: hasDraft });
  // Covers the whole dialog-mediated send (inline save + send request), not
  // just the mutation's own pending window.
  const [sending, setSending] = useState(false);

  const mailContacts = useMemo(
    () =>
      (profileQuery.data?.contacts ?? [])
        .filter((contact) => contact.includedInPortfolio)
        .map((contact) => {
          return { type: contact.type, value: contact.value };
        }),
    [profileQuery.data]
  );

  // Draft retention shipped after this kit was accepted — editing requires a re-prepare.
  if (draft == null && application.resumeId != null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          The last draft predates draft retention — prepare the package again to edit the outreach
          email.
        </p>
      </div>
    );
  }

  if (draft == null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="text-sm text-muted-foreground">
          No draft to edit — prepare the package again.
        </p>
      </div>
    );
  }

  const toValue = draft.proposedRecruiterEmail ?? application.recruiterEmail ?? "";
  const hasRecipient = toValue.trim().length > 0;
  const anyAttachment = attachments.resume || attachments.cover;
  const sendDisabled = !anyAttachment || busy || sendPending || sending;

  async function handleSend() {
    setSending(true);
    try {
      const sent = await onSend(attachments);
      if (sent) onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-muted/40">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6">
        <PaneQueryGate
          pending={profileQuery.isPending}
          errored={profileQuery.isError}
          errorTitle="Couldn't load your profile — the mail signature may be incomplete."
          onRetry={() => void profileQuery.refetch()}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apply-email-to" className="text-xs font-semibold text-muted-foreground">
              To (recruiter email)
            </label>
            <Input
              id="apply-email-to"
              type="email"
              value={toValue}
              disabled={busy}
              placeholder="recruiter@company.com"
              onChange={(event) => {
                const value = event.target.value;
                onDraftChange((prev) => {
                  return {
                    ...prev,
                    proposedRecruiterEmail: value.trim() ? value : null
                  };
                });
              }}
            />
          </div>

          <OutboundMailPreview
            subject={draft.outreachSubject}
            bodyText={draft.outreachBody}
            senderName={profileQuery.data?.name ?? null}
            contacts={mailContacts}
            onSubjectChange={(subject) =>
              onDraftChange((prev) => {
                return { ...prev, outreachSubject: subject };
              })
            }
            onBodyChange={(bodyText) =>
              onDraftChange((prev) => {
                return { ...prev, outreachBody: bodyText };
              })
            }
            className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
          />

          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              Attach to email
            </p>
            <AttachmentCard
              filename={`Resume — ${application.companyName}.pdf`}
              sub={application.resumeId != null ? "Tailored · accepted kit" : "Generated on Save"}
              missing={application.resumeId == null}
              checked={attachments.resume}
              disabled={busy}
              onToggle={() =>
                onAttachmentsChange((prev) => {
                  return { ...prev, resume: !prev.resume };
                })
              }
            />
            <AttachmentCard
              filename={
                application.coverLetterFilename ?? `Cover letter — ${application.companyName}.pdf`
              }
              sub={
                application.coverLetterR2Key != null
                  ? "Tailored · accepted kit"
                  : "Generated on Save"
              }
              missing={application.coverLetterR2Key == null}
              checked={attachments.cover}
              disabled={busy}
              onToggle={() =>
                onAttachmentsChange((prev) => {
                  return { ...prev, cover: !prev.cover };
                })
              }
            />
            {!anyAttachment ? (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Keep at least one attachment — you can&apos;t send an empty application.
              </p>
            ) : null}
          </div>

          {hasRecipient ? (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                loading={sending || sendPending}
                disabled={sendDisabled}
                onClick={() => void handleSend()}
              >
                <SendIcon aria-hidden />
                Send
              </Button>
            </div>
          ) : null}
        </PaneQueryGate>
      </div>
    </div>
  );
}
