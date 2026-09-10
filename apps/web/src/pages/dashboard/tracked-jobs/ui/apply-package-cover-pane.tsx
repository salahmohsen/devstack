"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

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
};

/** Cover letter paper of the review dialog: the rendered letter IS the editor. */
export function ApplyPackageCoverPane({
  application,
  draft,
  onDraftChange
}: ApplyPackageCoverPaneProps) {
  const hasDraft = draft != null;
  const profileQuery = useQuery({ ...getProfileQueryOptions(), enabled: hasDraft });

  // One letter date per pane mount — re-renders must not drift the date line.
  const [letterDate] = useState(() => new Date());

  const coverBody = draft?.coverLetterBody ?? null;

  const model = useMemo(() => {
    if (coverBody == null) return null;
    return buildCoverLetterModel({
      candidateName: profileQuery.data?.name ?? "Candidate",
      contacts: (profileQuery.data?.contacts ?? []).map((contact) => {
        return {
          type: contact.type,
          value: contact.value,
          sortOrder: contact.sortOrder
        };
      }),
      profileEmail: profileQuery.data?.email ?? "",
      companyName: application.companyName,
      roleTitle: application.title,
      body: coverBody,
      date: letterDate
    });
  }, [coverBody, profileQuery.data, application.companyName, application.title, letterDate]);

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

  const paper = model ? (
    <CoverLetterPaper
      model={model}
      onBodyChange={(next) =>
        onDraftChange((prev) => {
          return { ...prev, coverLetterBody: next };
        })
      }
      className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
    />
  ) : (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-border/60 bg-background">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* lg+ — paper-first: the pane owns the scroll, the paper sits centered. */}
      <div className="hidden min-h-0 flex-1 justify-center overflow-y-auto bg-muted/40 px-6 py-6 lg:flex">
        <div className="w-full max-w-160">
          <PaneQueryGate {...gateProps}>{paper}</PaneQueryGate>
        </div>
      </div>

      {/* below-lg — the same narrow-friendly paper, stacked. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:hidden">
        <div className="mx-auto w-full max-w-160">
          <PaneQueryGate {...gateProps}>{paper}</PaneQueryGate>
        </div>
      </div>
    </div>
  );
}
