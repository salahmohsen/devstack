"use client";

import { type Dispatch, type SetStateAction } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";

export type ApplyPackageEmailPaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft | null>>;
  busy: boolean;
  /** After a successful Send the dialog closes. */
  onSent: () => void;
};

/** Stub — the rendered Matte mail editor + attachment squares land with the next slice. */
export function ApplyPackageEmailPane(_props: ApplyPackageEmailPaneProps) {
  return (
    <div className="grid h-full place-items-center p-6">
      <p className="text-sm text-muted-foreground">Email pane lands with the next slice.</p>
    </div>
  );
}
