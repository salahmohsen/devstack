"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

import { buildCoverLetterModel } from "@/shared/resume-doc-preview/cover-letter-model";
import { CoverLetterPaper } from "@/shared/resume-doc-preview/cover-letter-paper";

import { getProfileQueryOptions } from "@/features/profile";

import { PaneQueryGate } from "./apply-package-pane-gate";

export type ApplyPackageCoverPaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
  /** Fixed per dialog open — owned by the dialog so section switches don't drift it. */
  letterDate: Date;
};

/** Cover letter paper of the review dialog: the rendered letter IS the editor. */
export function ApplyPackageCoverPane({
  application,
  draft,
  onDraftChange,
  busy,
  letterDate
}: ApplyPackageCoverPaneProps) {
  const hasDraft = draft != null;
  const profileQuery = useQuery({ ...getProfileQueryOptions(), enabled: hasDraft });

  // Hooks before the early returns; legacy null-draft packages render the
  // notice below and never use the model. coverLetterBody is required on the
  // draft, so a non-null draft always yields the paper.
  const coverBody = draft?.coverLetterBody ?? null;

  const model = useMemo(
    () =>
      buildCoverLetterModel({
        candidateName: profileQuery.data?.name ?? "Candidate",
        // PDF parity: the paper renders opted-in contacts only, same filter as
        // the resume build and the email pane.
        contacts: (profileQuery.data?.contacts ?? [])
          .filter((contact) => contact.includedInPortfolio)
          .map((contact) => {
            return {
              type: contact.type,
              value: contact.value,
              sortOrder: contact.sortOrder
            };
          }),
        profileEmail: profileQuery.data?.email ?? "",
        companyName: application.companyName,
        roleTitle: application.title,
        body: coverBody ?? "",
        date: letterDate
      }),
    [coverBody, profileQuery.data, application.companyName, application.title, letterDate]
  );

  // Draft retention shipped after this kit was accepted — editing requires a re-prepare.
  if (draft == null && application.resumeId != null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          The last draft predates draft retention — prepare the package again to edit the tailored
          cover letter.
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

  const gateProps = {
    pending: profileQuery.isPending,
    errored: profileQuery.isError,
    errorTitle: "Couldn't load your profile — the letter header may be incomplete.",
    onRetry: () => void profileQuery.refetch()
  };

  // One scroll container for every viewport — the same paper (never two live
  // copies with one CSS-hidden).
  return (
    <div className="flex h-full min-h-0 justify-center overflow-y-auto bg-muted/40 p-4 lg:px-6 lg:py-6">
      <div className="w-full max-w-160">
        <PaneQueryGate {...gateProps}>
          <CoverLetterPaper
            model={model}
            onBodyChange={(next) =>
              onDraftChange((prev) => {
                return { ...prev, coverLetterBody: next };
              })
            }
            disabled={busy}
            className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
          />
        </PaneQueryGate>
      </div>
    </div>
  );
}
