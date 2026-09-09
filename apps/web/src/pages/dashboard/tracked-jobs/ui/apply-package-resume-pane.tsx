"use client";

import { type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

export type ApplyPackageResumePaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft | null>>;
  busy: boolean;
};

/** Stub — the tailored resume paper lands with the next slice. */
export function ApplyPackageResumePane(_props: ApplyPackageResumePaneProps) {
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Resume paper lands with the next slice.</p>
    </div>
  );
}
