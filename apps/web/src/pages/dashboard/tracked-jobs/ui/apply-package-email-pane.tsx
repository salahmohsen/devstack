"use client";

import { type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

export type ApplyPackageEmailPaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
  /** After a successful Send the dialog closes. */
  onSent: () => void;
  // Task 16 Send semantics: Save-when-dirty becomes kit-currency-gated —
  // `if (!kitCurrent) save first` so Send never ships with stale kit PDFs.
};

/** Stub — the rendered Matte mail editor + attachment squares land with the next slice. */
export function ApplyPackageEmailPane(_props: ApplyPackageEmailPaneProps) {
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Email pane lands with the next slice.</p>
    </div>
  );
}
