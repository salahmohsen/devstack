"use client";

import { formatDistanceToNow } from "date-fns";
import { BookOpenIcon, CheckIcon, ExternalLinkIcon, FileTextIcon, MailIcon } from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SetStateAction
} from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";
import { splitCoverLetterParagraphs } from "@tsu-stack/pdf/doc";
import { Button } from "@tsu-stack/ui/components/button";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
import { DialogDescription, DialogFooter, DialogTitle } from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ItemAvatar } from "@/shared/ui/item-avatar";

import {
  parseApplyPackageDraft,
  useAcceptApplyPackageMutation,
  useGenerateApplyPackageMutation
} from "@/features/applications";

import {
  useApplicationStore,
  type ApplyPackageSection
} from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const ApplyPackageResumePane = lazy(() =>
  import("./apply-package-resume-pane").then((m) => {
    return { default: m.ApplyPackageResumePane };
  })
);

const ApplyPackageCoverPane = lazy(() =>
  import("./apply-package-cover-pane").then((m) => {
    return { default: m.ApplyPackageCoverPane };
  })
);

const ApplyPackageEmailPane = lazy(() =>
  import("./apply-package-email-pane").then((m) => {
    return { default: m.ApplyPackageEmailPane };
  })
);

const SECTIONS: Array<{
  id: ApplyPackageSection;
  label: string;
  icon: typeof FileTextIcon;
}> = [
  { id: "resume", label: "Resume", icon: FileTextIcon },
  { id: "cover", label: "Cover letter", icon: BookOpenIcon },
  { id: "email", label: "Email", icon: MailIcon }
];

const CHIP_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap";

/** Compact `host/path` label for the listing URL chip; falls back to a raw trim. */
function listingChipLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname.replace(/\/$/, "")}`.slice(0, 48);
  } catch {
    return url.trim().slice(0, 48);
  }
}

function PanePending() {
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Loading section…</p>
    </div>
  );
}

/** Empty / whitespace-only emails compare (and save) as null. */
function normalizeDraftEmail(value: string | null): string | null {
  const trimmed = value?.trim() ?? null;
  return trimmed != null && trimmed.length > 0 ? trimmed : null;
}

export function ApplyPackageDialog({ application }: { application: ApplicationOutput }) {
  const {
    packageDialogSection,
    setPackageDialogSection,
    closePackageDialog,
    markApplyPackageInFlight,
    acceptedDraftGeneratedAtById,
    setAcceptedDraftGeneratedAt
  } = useApplicationStore();
  const acceptMutation = useAcceptApplyPackageMutation();
  const generateMutation = useGenerateApplyPackageMutation();
  const [draft, setDraft] = useState<ApplyPackageDraft | null>(() =>
    parseApplyPackageDraft(application.applyPackageDraft)
  );
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  // Panes edit a live non-null draft; the dialog owns the nullable state.
  // Updaters only fire from panes rendering a draft, so `prev` is non-null there.
  const updateDraft = useCallback((value: SetStateAction<ApplyPackageDraft>) => {
    setDraft((prev) => (typeof value === "function" ? value(prev as ApplyPackageDraft) : value));
  }, []);

  const serverDraft = useMemo(
    () => parseApplyPackageDraft(application.applyPackageDraft),
    [application]
  );

  // Re-seed the local draft when regeneration replaces the server draft: the
  // generate mutation invalidates applications.get, the refetched application
  // carries a new draftedAt. Keyed on the ISO string so window-focus refetches
  // holding the same draft never wipe in-dialog edits.
  const draftedAtIso = application.applyPackageDraftedAt?.toISOString() ?? null;
  useEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- re-seed on regeneration only
    setDraft(parseApplyPackageDraft(application.applyPackageDraft));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- key on draftedAt so same-draft refetches never wipe edits
  }, [draftedAtIso]);

  const kitAccepted = application.resumeId != null;
  const busy = acceptMutation.isPending || generateMutation.isPending;

  /** Whitespace-only email edits must not keep Save lit (mirror the trim-on-submit). */
  const dirty = useMemo(() => {
    if (draft == null || serverDraft == null) return false;
    const local = {
      ...draft,
      proposedRecruiterEmail: normalizeDraftEmail(draft.proposedRecruiterEmail)
    };
    const server = {
      ...serverDraft,
      proposedRecruiterEmail: normalizeDraftEmail(serverDraft.proposedRecruiterEmail)
    };
    return JSON.stringify(local) !== JSON.stringify(server);
  }, [draft, serverDraft]);

  /**
   * Kit currency is explicit: accepted AND the accepted draft is this draft.
   * The accepted-draft generatedAt marker lives in module state (survives
   * dialog remounts); Regenerate's re-seed picks up a new generatedAt, so
   * kitCurrent flips false and Save re-enables without extra flags.
   */
  const kitCurrent =
    kitAccepted && acceptedDraftGeneratedAtById[application.id] === draft?.generatedAt;
  // dirty stays as the belt-and-suspenders arm: accept keeps the server
  // draft, so a local edit after accept keeps the same generatedAt marker.
  const canSave = draft != null && !busy && (dirty || !kitCurrent);
  const saveHint =
    draft == null
      ? "No draft to save"
      : kitCurrent && !dirty
        ? "Kit is current with this draft"
        : undefined;

  const resumeCount = useMemo(() => {
    if (!draft) return null;
    const included =
      draft.experiences.filter((exp) => exp.include).length +
      draft.projects.filter((project) => project.include).length;
    const total = draft.experiences.length + draft.projects.length;
    const includedStacks = draft.stacks.filter((stack) => stack.include).length;
    return includedStacks > 0 ? `${included}/${total} + ${includedStacks}` : `${included}/${total}`;
  }, [draft]);

  const coverCount = useMemo(
    () => (draft ? `${splitCoverLetterParagraphs(draft.coverLetterBody).length} ¶` : null),
    [draft]
  );

  const emailCount = `${kitAccepted ? 2 : 0} PDF`;

  function handleSave() {
    if (!draft) return;
    const applicationId = application.id;
    markApplyPackageInFlight(applicationId, true);
    acceptMutation.mutate(
      {
        applicationId,
        draft: {
          ...draft,
          proposedRecruiterEmail: draft.proposedRecruiterEmail?.trim()
            ? draft.proposedRecruiterEmail.trim()
            : null
        }
      },
      {
        // Kit is now current with this exact draft — record the marker so
        // Save disables until a new edit or regenerate lands.
        onSuccess: () => setAcceptedDraftGeneratedAt(applicationId, draft.generatedAt),
        onSettled: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  function handleRegenerate() {
    const applicationId = application.id;
    markApplyPackageInFlight(applicationId, true);
    generateMutation.mutate(
      { applicationId },
      {
        onSettled: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  const draftedAt = application.applyPackageDraftedAt;

  return (
    <>
      <header className="flex shrink-0 items-start gap-3.5 border-b px-6 pe-10 pt-4 pb-3.5">
        <ItemAvatar
          name={application.companyName}
          imageSrc={application.companyLogoUrl}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-base leading-tight font-semibold tracking-[-0.01em]">
            {application.title}
            <span className="font-normal text-muted-foreground"> · {application.companyName}</span>
          </DialogTitle>
          <DialogDescription render={<div className="mt-1.5 flex flex-wrap items-center gap-2" />}>
            {draft?.jobContext.listingFetched ? (
              <span
                className={cn(
                  CHIP_PILL,
                  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                )}
              >
                <CheckIcon className="size-3" strokeWidth={2.5} aria-hidden />
                Listing page included
              </span>
            ) : null}
            {draft?.jobContext.listingUrl ? (
              <a
                href={draft.jobContext.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">{listingChipLabel(draft.jobContext.listingUrl)}</span>
                <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
              </a>
            ) : null}
            {draft ? (
              draft.jobContext.descriptionUsed.trim().length > 0 ? (
                <details className="group w-fit max-w-full rounded-md border border-border/60 bg-muted/20 open:basis-full">
                  <summary
                    className={cn(
                      "flex w-fit cursor-pointer list-none items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
                      "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      "[&::-webkit-details-marker]:hidden"
                    )}
                  >
                    Description used
                    <span className="font-normal text-muted-foreground/80">
                      · {draft.jobContext.descriptionUsed.length.toLocaleString()} chars
                    </span>
                    <span className="hidden font-normal text-muted-foreground/80 group-open:inline">
                      (hide)
                    </span>
                    <span className="font-normal text-muted-foreground/80 group-open:hidden">
                      (show)
                    </span>
                  </summary>
                  <div className="max-h-40 overflow-auto border-t border-border/50 px-3 py-2">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {draft.jobContext.descriptionUsed}
                    </p>
                  </div>
                </details>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No job description was available
                </span>
              )
            ) : null}
          </DialogDescription>
        </div>
        <div className="shrink-0 pt-0.5">
          {kitAccepted ? (
            <span className={cn(CHIP_PILL, "bg-muted text-muted-foreground")}>
              <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" />
              Accepted
            </span>
          ) : (
            <span
              className={cn(
                CHIP_PILL,
                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              )}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
              />
              Draft · generated{" "}
              {draftedAt ? (
                <time dateTime={draftedAt.toISOString()}>
                  {formatDistanceToNow(draftedAt, { addSuffix: true })}
                </time>
              ) : null}
            </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Package sections"
          className="flex w-56 shrink-0 flex-col gap-0.5 border-r bg-muted/30 p-2.5"
        >
          <p className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Package
          </p>
          {SECTIONS.map((section) => {
            const active = packageDialogSection === section.id;
            const count =
              section.id === "resume"
                ? resumeCount
                : section.id === "cover"
                  ? coverCount
                  : emailCount;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => setPackageDialogSection(section.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-border bg-background text-foreground shadow-xs"
                    : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-start">{section.label}</span>
                {count ? (
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
          <p className="mt-auto border-t px-2 pt-3 text-[11px] leading-snug text-muted-foreground">
            Everything edits directly on the paper.
          </p>
        </nav>

        <div
          key={packageDialogSection}
          className="min-w-0 flex-1 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
        >
          <Suspense fallback={<PanePending />}>
            {packageDialogSection === "cover" ? (
              <ApplyPackageCoverPane
                application={application}
                draft={draft}
                onDraftChange={updateDraft}
                busy={busy}
              />
            ) : packageDialogSection === "email" ? (
              <ApplyPackageEmailPane
                application={application}
                draft={draft}
                onDraftChange={updateDraft}
                busy={busy}
                onSent={closePackageDialog}
              />
            ) : (
              <ApplyPackageResumePane
                application={application}
                draft={draft}
                onDraftChange={updateDraft}
                busy={busy}
              />
            )}
          </Suspense>
        </div>
      </div>

      <DialogFooter className="flex-row items-center justify-between gap-3 bg-muted/40 px-6 py-3 sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Edits stay local until Save · Send saves first
        </p>
        <div className="flex items-center gap-2">
          {saveHint ? <p className="text-xs text-muted-foreground">{saveHint}</p> : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setRegenerateOpen(true)}
          >
            Regenerate
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={closePackageDialog}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            loading={acceptMutation.isPending}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </DialogFooter>

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="Regenerate apply package?"
        description="This runs AI again and overwrites the current draft. Your accepted resume and cover letter stay until you Accept a new package. Uses your BYO model quota."
        confirmLabel="Regenerate"
        confirmLoading={generateMutation.isPending}
        onConfirm={() => {
          handleRegenerate();
          setRegenerateOpen(false);
        }}
      />
    </>
  );
}
