"use client";

import {
  ChevronDownIcon,
  DownloadIcon,
  EyeIcon,
  FilePenIcon,
  FileTextIcon,
  MailIcon,
  PackageIcon,
  RefreshCwIcon,
  SparklesIcon
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { TiltCard } from "@/shared/ui/motion/tilt-card";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  actionsFor,
  canSendOutreach,
  coverLetterDownloadUrl,
  formatCoverLetterCopy,
  formatOutreachCopy,
  getApplyPackageEntryState,
  hasJobDescription,
  materialsFor,
  resumeDownloadUrl,
  writeClipboardText,
  type ApplicationMaterialKind,
  type ApplicationPrimaryActionKind,
  type MaterialActionId
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { useDashboardApplyPackage } from "@/pages/dashboard/tracked-jobs/_lib/use-dashboard-apply-package";
import { type ApplicationActionSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";

type ApplyPackageMenuItemsProps = {
  app: ApplicationOutput;
  /** Full slots so Materials can open a Sub. */
  slots: ApplicationActionSlots;
  /** Omit the menu entry that matches the visible magic CTA. */
  hidePrimaryKind?: ApplicationPrimaryActionKind | null;
};

/**
 * Board / context menu items for apply package entry actions.
 * Regenerate always confirms (cost + overwrite).
 */

async function copyText(label: string, value: string | null) {
  if (!value) {
    toast.error(`Nothing to copy for ${label}`);
    return;
  }
  const ok = await writeClipboardText(value);
  if (ok) toast.success("Copied");
  else toast.error("Could not copy");
}

function triggerDownload(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = "";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function runMaterialAction(
  app: ApplicationOutput,
  kind: ApplicationMaterialKind,
  actionId: MaterialActionId,
  openMaterialPreview: (applicationId: string, kind: ApplicationMaterialKind) => void
) {
  if (actionId === "preview") {
    openMaterialPreview(app.id, kind);
    return;
  }
  if (actionId === "download") {
    if (kind === "resume" && app.resumeId) {
      triggerDownload(resumeDownloadUrl(app.resumeId));
      return;
    }
    if (kind === "cover-letter" && app.coverLetterR2Key) {
      triggerDownload(coverLetterDownloadUrl(app.id));
      return;
    }
    toast.error("Download unavailable");
    return;
  }
  if (actionId === "copy") {
    if (kind === "cover-letter") {
      void copyText("cover letter", formatCoverLetterCopy(app));
      return;
    }
    if (kind === "outreach") {
      void copyText("outreach email", formatOutreachCopy(app));
      return;
    }
  }
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

export function ApplyPackageMenuItems({
  app,
  slots,
  hidePrimaryKind = null
}: ApplyPackageMenuItemsProps) {
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;
  const { openSendOutreach, openEdit, openMaterialPreview } = useApplicationStore();
  const { runGenerate, runReview, pending } = useDashboardApplyPackage();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = pending;
  const hasDescription = hasJobDescription(app);
  const materials = useMemo(() => materialsFor(app), [app]);

  function generate() {
    runGenerate(app.id, () => setRegenerateOpen(false));
  }

  return (
    <>
      <Separator />
      {entryState === "none" ? (
        hasDescription ? (
          hidePrimaryKind === "prepare" ? null : (
            <Item disabled={!open || generating} onClick={() => open && generate()}>
              <SparklesIcon aria-hidden="true" />
              {generating ? "Preparing…" : APPLICATION_PRIMARY_ACTION_LABELS.prepare}
            </Item>
          )
        ) : hidePrimaryKind === "add-jd" ? null : (
          <Item disabled={!open} onClick={() => openEdit(app)}>
            <FileTextIcon aria-hidden="true" />
            {APPLICATION_PRIMARY_ACTION_LABELS.addJd}
          </Item>
        )
      ) : null}
      {entryState === "draft" ? (
        <>
          {hidePrimaryKind === "review" ? null : (
            <Item disabled={generating} onClick={() => runReview(app.id)}>
              <PackageIcon aria-hidden="true" />
              {APPLICATION_PRIMARY_ACTION_LABELS.review}
            </Item>
          )}
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
                Materials
              </SubTrigger>
              <SubPopup>
                {materials.map((material) => (
                  <Sub key={material.kind}>
                    <SubTrigger>
                      {material.kind === "outreach" ? (
                        <MailIcon aria-hidden="true" />
                      ) : (
                        <FileTextIcon aria-hidden="true" />
                      )}
                      {material.label}
                    </SubTrigger>
                    <SubPopup>
                      {actionsFor(material.kind, app).map((action) => (
                        <Item
                          key={action.id}
                          onClick={() =>
                            runMaterialAction(app, material.kind, action.id, openMaterialPreview)
                          }
                        >
                          {action.label}
                        </Item>
                      ))}
                    </SubPopup>
                  </Sub>
                ))}
              </SubPopup>
            </Sub>
          ) : null}
          <Item disabled={!open || generating} onClick={() => open && setRegenerateOpen(true)}>
            <SparklesIcon aria-hidden="true" />
            {generating ? "Preparing…" : "Prepare again"}
          </Item>
          {canSendOutreach(app) && hidePrimaryKind !== "send" ? (
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
                generate();
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
 * Joined coss Group of filled `default` buttons — separators use bg-primary/72 (coss p-group-6).
 */
export function ApplyPackagePanelActions({ app, className }: ApplyPackagePanelActionsProps) {
  const { openSendOutreach, openEdit, openMaterialPreview } = useApplicationStore();
  const { runGenerate, runReview, pending } = useDashboardApplyPackage();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = pending;
  const hasDescription = hasJobDescription(app);
  const materials = useMemo(() => materialsFor(app), [app]);

  function generate() {
    runGenerate(app.id, () => setRegenerateOpen(false));
  }

  const segments: React.ReactNode[] = [];

  if (entryState === "none") {
    if (hasDescription) {
      segments.push(
        <Button
          key="prepare"
          type="button"
          size="sm"
          variant="default"
          disabled={!open || generating}
          loading={generating}
          className="min-w-0 flex-1 active:scale-[0.96]"
          onClick={() => generate()}
        >
          <SparklesIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
          {generating ? "Preparing…" : APPLICATION_PRIMARY_ACTION_LABELS.prepare}
        </Button>
      );
    } else {
      segments.push(
        <Button
          key="add-jd"
          type="button"
          size="sm"
          variant="default"
          disabled={!open}
          className="min-w-0 flex-1 active:scale-[0.96]"
          onClick={() => openEdit(app)}
        >
          <FileTextIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
          {APPLICATION_PRIMARY_ACTION_LABELS.addJd}
        </Button>
      );
    }
  }

  if (entryState === "draft") {
    segments.push(
      <Button
        key="review"
        type="button"
        size="sm"
        variant="default"
        className="min-w-0 flex-1 active:scale-[0.96]"
        onClick={() => runReview(app.id)}
      >
        <PackageIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
        {APPLICATION_PRIMARY_ACTION_LABELS.review}
      </Button>
    );
    segments.push(
      <Button
        key="regenerate"
        type="button"
        size="sm"
        variant="default"
        disabled={!open || generating}
        className="min-w-0 flex-1 active:scale-[0.96]"
        onClick={() => setRegenerateOpen(true)}
      >
        <RefreshCwIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
        Regenerate
      </Button>
    );
  }

  if (entryState === "accepted") {
    segments.push(
      <Button
        key="prepare-again"
        type="button"
        size="sm"
        variant="default"
        disabled={!open || generating}
        loading={generating}
        className="min-w-0 flex-1 active:scale-[0.96]"
        onClick={() => setRegenerateOpen(true)}
      >
        <SparklesIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
        Prepare again
      </Button>
    );
    if (canSendOutreach(app)) {
      segments.push(
        <Button
          key="send"
          type="button"
          size="sm"
          variant="default"
          className="min-w-0 flex-1 active:scale-[0.96]"
          onClick={() => openSendOutreach(app.id)}
        >
          <MailIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
          Send outreach
        </Button>
      );
    }
  }

  const showChevron = materials.length > 0 || entryState !== "none";

  return (
    <div className={className}>
      {segments.length > 0 ? (
        <Group aria-label="Application kit actions" className="w-full max-w-full items-stretch">
          {segments.map((segment, index) => (
            <Fragment key={index}>
              {index > 0 ? <GroupSeparator className="bg-primary/72" /> : null}
              {segment}
            </Fragment>
          ))}
          {showChevron ? (
            <>
              <GroupSeparator className="bg-primary/72" />
              <Menu>
                <MenuTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="default"
                      aria-label="Package materials"
                      className="size-8 shrink-0 active:scale-[0.96] sm:size-7"
                    />
                  }
                >
                  <ChevronDownIcon className="size-4" strokeWidth={1.75} aria-hidden />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-44">
                  {materials.length > 0 ? (
                    materials.map((material) => (
                      <MenuSub key={material.kind}>
                        <MenuSubTrigger>
                          {material.kind === "outreach" ? (
                            <MailIcon aria-hidden="true" />
                          ) : (
                            <FileTextIcon aria-hidden="true" />
                          )}
                          {material.label}
                        </MenuSubTrigger>
                        <MenuSubPopup>
                          {actionsFor(material.kind, app).map((action) => (
                            <MenuItem
                              key={action.id}
                              onClick={() =>
                                runMaterialAction(
                                  app,
                                  material.kind,
                                  action.id,
                                  openMaterialPreview
                                )
                              }
                            >
                              {action.label}
                            </MenuItem>
                          ))}
                        </MenuSubPopup>
                      </MenuSub>
                    ))
                  ) : (
                    <MenuItem disabled>No materials yet</MenuItem>
                  )}
                </MenuPopup>
              </Menu>
            </>
          ) : null}
        </Group>
      ) : null}

      {entryState === "accepted" && !canSendOutreach(app) ? (
        app.outreachSentAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Outreach sent {new Date(app.outreachSentAt).toLocaleDateString()}
          </p>
        ) : open ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Set recruiter email (Edit) and accept outreach copy to send
          </p>
        ) : null
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
                generate();
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

function copyValueFor(kind: ApplicationMaterialKind, app: ApplicationOutput): string {
  if (kind === "cover-letter") return formatCoverLetterCopy(app) ?? "";
  if (kind === "outreach") return formatOutreachCopy(app) ?? "";
  return "";
}

function materialIcon(kind: ApplicationMaterialKind) {
  if (kind === "outreach") return MailIcon;
  if (kind === "cover-letter") return FilePenIcon;
  return FileTextIcon;
}

function KitIconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={label}
            className="min-w-0 flex-1 active:scale-[0.96]"
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

/** Compact wrap of tilt cards for resume / cover letter / outreach. */
export function ApplicationKitMaterials({ app }: { app: ApplicationOutput }) {
  const { openMaterialPreview } = useApplicationStore();
  const materials = useMemo(() => materialsFor(app), [app]);
  if (materials.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {materials.map((material) => {
          const actions = actionsFor(material.kind, app);
          const Icon = materialIcon(material.kind);
          const copyValue = copyValueFor(material.kind, app);
          return (
            <TiltCard
              key={material.kind}
              max={12}
              className={cn(
                "min-w-31 flex-1 basis-31 bg-muted/25 p-2 dark:bg-muted/10",
                "shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_1px_2px_-1px_oklch(0_0_0/0.06)]",
                "dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08)]"
              )}
            >
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground">
                  <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{material.label}</p>
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">
                    {material.meta}
                  </p>
                </div>
              </div>
              <Group aria-label={`${material.label} actions`} className="w-full">
                {actions.map((action, index) => (
                  <Fragment key={action.id}>
                    {index > 0 ? <GroupSeparator /> : null}
                    {action.id === "copy" ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <CopyButton
                              value={copyValue}
                              label={action.label}
                              size="icon-sm"
                              variant="outline"
                              iconSize={14}
                              className="min-w-0 flex-1 active:scale-[0.96]"
                            />
                          }
                        />
                        <TooltipPopup>{action.label}</TooltipPopup>
                      </Tooltip>
                    ) : (
                      <KitIconButton
                        label={action.label}
                        onClick={() =>
                          runMaterialAction(app, material.kind, action.id, openMaterialPreview)
                        }
                      >
                        {action.id === "preview" ? (
                          <EyeIcon className="size-3.5" strokeWidth={2} aria-hidden />
                        ) : (
                          <DownloadIcon className="size-3.5" strokeWidth={2} aria-hidden />
                        )}
                      </KitIconButton>
                    )}
                  </Fragment>
                ))}
              </Group>
            </TiltCard>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
