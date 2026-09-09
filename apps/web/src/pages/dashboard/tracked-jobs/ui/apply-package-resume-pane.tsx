"use client";

import { type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

export type ApplyPackageResumePaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
};

/** Stub — the tailored resume paper lands with the next slice. */
export function ApplyPackageResumePane({ application, draft }: ApplyPackageResumePaneProps) {
  // Draft retention shipped after this kit was accepted — editing requires a re-prepare.
  if (draft == null && application.resumeId != null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          The last draft predates draft retention — prepare the package again to edit the tailored
          resume.
        </p>
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Resume paper lands with the next slice.</p>
    </div>
  );
}
