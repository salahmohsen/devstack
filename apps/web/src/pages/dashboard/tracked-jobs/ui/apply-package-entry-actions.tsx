"use client";

import { FileTextIcon, MailIcon, PackageIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { type ApplicationOutput, isApplicationOpen } from "@tsu-stack/core";
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
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  canSendOutreach,
  coverLetterDownloadUrl,
  getApplyPackageEntryState,
  hasJobDescription,
  resumeDownloadUrl,
  useGenerateApplyPackageMutation
} from "@/features/applications";

import {
  useApplicationStore,
  type ApplicationMaterialKind
} from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { type ApplicationActionSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";

type ApplyPackageMenuItemsProps = {
  app: ApplicationOutput;
  /** Full slots so Review materials can open a Sub. */
  slots: ApplicationActionSlots;
};

type MaterialOption = {
  kind: ApplicationMaterialKind;
  label: string;
};

/**
 * Board / context menu items for apply package entry actions.
 * Regenerate always confirms (cost + overwrite).
 */

function materialsFor(app: ApplicationOutput): MaterialOption[] {
  const items: MaterialOption[] = [];
  if (app.resumeId) {
    items.push({ kind: "resume", label: "Resume" });
  }
  if (app.coverLetterR2Key || app.coverLetterBody?.trim()) {
    items.push({ kind: "cover-letter", label: "Cover letter" });
  }
  if (app.outreachSubject?.trim() || app.outreachBody?.trim()) {
    items.push({ kind: "outreach", label: "Outreach email" });
  }
  return items;
}

/** Page-level host — do not mount inside Menu/ContextMenu (unmount closes dialog). */
export function ApplicationMaterialPreviewDialog({
  app,
  kind,
  open,
  onOpenChange
}: {
  app: ApplicationOutput;
  kind: ApplicationMaterialKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!kind) return null;

  if (kind === "resume" && app.resumeId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup
          className="flex h-[min(90dvh,56rem)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
          bottomStickOnMobile={false}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Resume preview</DialogTitle>
            <DialogDescription>Linked resume PDF for this application.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/30">
            <embed
              src={resumeDownloadUrl(app.resumeId, true)}
              type="application/pdf"
              className="h-full min-h-0 w-full"
              title="Resume PDF"
            />
          </div>
        </DialogPopup>
      </Dialog>
    );
  }

  if (kind === "cover-letter") {
    if (app.coverLetterR2Key) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogPopup
            className="flex h-[min(90dvh,56rem)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
            bottomStickOnMobile={false}
          >
            <DialogHeader className="shrink-0 border-b px-5 py-4">
              <DialogTitle className="truncate pe-8">
                {app.coverLetterFilename?.trim()
                  ? app.coverLetterFilename.trim()
                  : "Cover letter preview"}
              </DialogTitle>
              <DialogDescription>Cover letter PDF for this application.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 bg-muted/30">
              <embed
                src={coverLetterDownloadUrl(app.id, true)}
                type="application/pdf"
                className="h-full min-h-0 w-full"
                title="Cover letter PDF"
              />
            </div>
          </DialogPopup>
        </Dialog>
      );
    }
    if (app.coverLetterBody?.trim()) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogPopup className="flex max-h-[min(90dvh,40rem)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="shrink-0 border-b px-5 py-4">
              <DialogTitle>Cover letter</DialogTitle>
              <DialogDescription>Cover letter text for this application.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {app.coverLetterBody}
              </pre>
            </div>
          </DialogPopup>
        </Dialog>
      );
    }
  }

  if (kind === "outreach") {
    const subject = app.outreachSubject?.trim() ? app.outreachSubject.trim() : "(no subject)";
    const body = app.outreachBody?.trim() ? app.outreachBody.trim() : "";
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup className="flex max-h-[min(90dvh,40rem)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Outreach email</DialogTitle>
            <DialogDescription>Subject and body prepared for outreach.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Subject
              </p>
              <p className="mt-1 text-sm text-foreground">{subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Body
              </p>
              <pre className="mt-1 font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {body || "—"}
              </pre>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    );
  }

  return null;
}

export function ApplyPackageMenuItems({ app, slots }: ApplyPackageMenuItemsProps) {
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;
  const { openPackageSheet, openSendOutreach, openEdit, openMaterialPreview } =
    useApplicationStore();
  const generateMutation = useGenerateApplyPackageMutation();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = generateMutation.isPending;
  const hasDescription = hasJobDescription(app);
  const materials = useMemo(() => materialsFor(app), [app]);

  function runGenerate() {
    generateMutation.mutate(
      { applicationId: app.id },
      {
        onSuccess: (data) => {
          setRegenerateOpen(false);
          openPackageSheet(data.id);
        }
      }
    );
  }

  return (
    <>
      <Separator />
      {entryState === "none" ? (
        hasDescription ? (
          <Item disabled={!open || generating} onClick={() => open && runGenerate()}>
            <SparklesIcon aria-hidden="true" />
            {generating ? "Preparing…" : APPLICATION_PRIMARY_ACTION_LABELS.prepare}
          </Item>
        ) : (
          <Item disabled={!open} onClick={() => openEdit(app)}>
            <FileTextIcon aria-hidden="true" />
            {APPLICATION_PRIMARY_ACTION_LABELS.addJd}
          </Item>
        )
      ) : null}
      {entryState === "draft" ? (
        <>
          <Item disabled={generating} onClick={() => openPackageSheet(app.id)}>
            <PackageIcon aria-hidden="true" />
            {APPLICATION_PRIMARY_ACTION_LABELS.review}
          </Item>
          <Item disabled={!open || generating} onClick={() => open && setRegenerateOpen(true)}>
            <RefreshCwIcon aria-hidden="true" />
            Regenerate
          </Item>
        </>
      ) : null}
      {entryState === "accepted" ? (
        <>
          {materials.length > 0 ? (
            <Sub>
              <SubTrigger>
                <FileTextIcon aria-hidden="true" />
                Review materials
              </SubTrigger>
              <SubPopup>
                {materials.map((material) => (
                  <Item
                    key={material.kind}
                    onClick={() => openMaterialPreview(app.id, material.kind)}
                  >
                    {material.kind === "outreach" ? (
                      <MailIcon aria-hidden="true" />
                    ) : (
                      <FileTextIcon aria-hidden="true" />
                    )}
                    {material.label}
                  </Item>
                ))}
              </SubPopup>
            </Sub>
          ) : null}
          <Item disabled={!open || generating} onClick={() => open && setRegenerateOpen(true)}>
            <SparklesIcon aria-hidden="true" />
            {generating ? "Preparing…" : "Prepare again"}
          </Item>
          {canSendOutreach(app) ? (
            <Item onClick={() => openSendOutreach(app.id)}>
              <MailIcon aria-hidden="true" />
              {APPLICATION_PRIMARY_ACTION_LABELS.send}
            </Item>
          ) : null}
        </>
      ) : null}

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entryState === "accepted" ? "Prepare a new package?" : "Regenerate apply package?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {entryState === "accepted"
                ? "AI will draft a new package. Your current resume and cover letter stay until you Accept the new package."
                : "This runs AI again and overwrites the current draft. Uses your BYO model quota."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              loading={generating}
              onClick={() => {
                runGenerate();
              }}
            >
              {entryState === "accepted" ? "Prepare again" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type ApplyPackagePanelActionsProps = {
  app: ApplicationOutput;
  className?: string;
};

/**
 * Primary CTAs for the application info panel (Prepare / Review / Send).
 */
export function ApplyPackagePanelActions({ app, className }: ApplyPackagePanelActionsProps) {
  const { openPackageSheet, openSendOutreach, openEdit } = useApplicationStore();
  const generateMutation = useGenerateApplyPackageMutation();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = generateMutation.isPending;
  const hasDescription = hasJobDescription(app);

  function runGenerate() {
    generateMutation.mutate(
      { applicationId: app.id },
      {
        onSuccess: (data) => {
          setRegenerateOpen(false);
          openPackageSheet(data.id);
        }
      }
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {entryState === "none" ? (
          hasDescription ? (
            <Button
              type="button"
              size="sm"
              disabled={!open || generating}
              loading={generating}
              onClick={() => runGenerate()}
            >
              <SparklesIcon className="size-3.5" aria-hidden />
              {APPLICATION_PRIMARY_ACTION_LABELS.prepare}
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={!open} onClick={() => openEdit(app)}>
              <FileTextIcon className="size-3.5" aria-hidden />
              {APPLICATION_PRIMARY_ACTION_LABELS.addJd}
            </Button>
          )
        ) : null}

        {entryState === "draft" ? (
          <>
            <Button type="button" size="sm" onClick={() => openPackageSheet(app.id)}>
              <PackageIcon className="size-3.5" aria-hidden />
              {APPLICATION_PRIMARY_ACTION_LABELS.review}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!open || generating}
              onClick={() => setRegenerateOpen(true)}
            >
              <RefreshCwIcon className="size-3.5" aria-hidden />
              Regenerate
            </Button>
          </>
        ) : null}

        {entryState === "accepted" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!open || generating}
              loading={generating}
              onClick={() => setRegenerateOpen(true)}
            >
              <SparklesIcon className="size-3.5" aria-hidden />
              Prepare again
            </Button>
            {canSendOutreach(app) ? (
              <Button type="button" size="sm" onClick={() => openSendOutreach(app.id)}>
                <MailIcon className="size-3.5" aria-hidden />
                {APPLICATION_PRIMARY_ACTION_LABELS.send}
              </Button>
            ) : app.outreachSentAt ? (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                Outreach sent {new Date(app.outreachSentAt).toLocaleDateString()}
              </span>
            ) : open ? (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                Set recruiter email (Edit) and accept outreach copy to send
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entryState === "accepted" ? "Prepare a new package?" : "Regenerate apply package?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {entryState === "accepted"
                ? "AI will draft a new package. Your current resume and cover letter stay until you Accept the new package."
                : "This runs AI again and overwrites the current draft. Uses your BYO model quota."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              loading={generating}
              onClick={() => {
                runGenerate();
              }}
            >
              {entryState === "accepted" ? "Prepare again" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
