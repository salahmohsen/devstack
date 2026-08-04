"use client";

import { FileTextIcon, MailIcon, PackageIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

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
  canSendOutreach,
  getApplyPackageEntryState,
  useGenerateApplyPackageMutation
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";

type MenuSlots = {
  Item: ComponentType<{
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "destructive";
  }>;
  Separator: ComponentType;
};

type ApplyPackageMenuItemsProps = {
  app: ApplicationOutput;
  slots: MenuSlots;
};

/**
 * Board / context menu items for apply package entry actions.
 * Regenerate always confirms (cost + overwrite).
 */
export function ApplyPackageMenuItems({ app, slots }: ApplyPackageMenuItemsProps) {
  const { Item, Separator } = slots;
  const { openPackageSheet, openSendOutreach, showView } = useApplicationStore();
  const generateMutation = useGenerateApplyPackageMutation();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = generateMutation.isPending;

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
        <Item disabled={!open || generating} onClick={() => open && runGenerate()}>
          <SparklesIcon aria-hidden="true" />
          {generating ? "Preparing…" : "Prepare application"}
        </Item>
      ) : null}
      {entryState === "draft" ? (
        <>
          <Item disabled={generating} onClick={() => openPackageSheet(app.id)}>
            <PackageIcon aria-hidden="true" />
            Review package
          </Item>
          <Item disabled={!open || generating} onClick={() => open && setRegenerateOpen(true)}>
            <RefreshCwIcon aria-hidden="true" />
            Regenerate
          </Item>
        </>
      ) : null}
      {entryState === "accepted" ? (
        <>
          <Item onClick={() => showView(app)}>
            <FileTextIcon aria-hidden="true" />
            Review materials
          </Item>
          <Item disabled={!open || generating} onClick={() => open && setRegenerateOpen(true)}>
            <SparklesIcon aria-hidden="true" />
            {generating ? "Preparing…" : "Prepare again"}
          </Item>
          {canSendOutreach(app) ? (
            <Item onClick={() => openSendOutreach(app.id)}>
              <MailIcon aria-hidden="true" />
              Send outreach
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
              disabled={generating}
              onClick={(e) => {
                e.preventDefault();
                runGenerate();
              }}
            >
              {generating
                ? "Generating…"
                : entryState === "accepted"
                  ? "Prepare again"
                  : "Regenerate"}
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
  const { openPackageSheet, openSendOutreach } = useApplicationStore();
  const generateMutation = useGenerateApplyPackageMutation();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const entryState = getApplyPackageEntryState(app);
  const open = isApplicationOpen(app.outcome);
  const generating = generateMutation.isPending;

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
      <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Apply package
      </p>
      <div className="flex flex-wrap gap-2">
        {entryState === "none" ? (
          <Button
            type="button"
            size="sm"
            disabled={!open || generating}
            loading={generating}
            onClick={() => runGenerate()}
          >
            <SparklesIcon className="size-3.5" aria-hidden />
            Prepare application
          </Button>
        ) : null}

        {entryState === "draft" ? (
          <>
            <Button type="button" size="sm" onClick={() => openPackageSheet(app.id)}>
              <PackageIcon className="size-3.5" aria-hidden />
              Review package
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
                Send outreach
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
              disabled={generating}
              onClick={(e) => {
                e.preventDefault();
                runGenerate();
              }}
            >
              {generating
                ? "Generating…"
                : entryState === "accepted"
                  ? "Prepare again"
                  : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
