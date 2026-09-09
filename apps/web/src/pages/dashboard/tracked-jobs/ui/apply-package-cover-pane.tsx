"use client";

import { type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

export type ApplyPackageCoverPaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
};

/** Stub — the Typst-mirroring cover letter paper lands with the next slice. */
export function ApplyPackageCoverPane(_props: ApplyPackageCoverPaneProps) {
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Cover letter paper lands with the next slice.</p>
    </div>
  );
}
