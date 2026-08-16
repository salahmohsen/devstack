"use client";

import * as React from "react";

import { type EvidenceKind } from "@tsu-stack/core";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";
import { FileDiff, lineDiff } from "@/shared/ui/agents/file-diff";

import { evidenceApprovalTitle } from "@/features/agent-hub/lib/evidence-change-payload";

export function EvidenceApprovalCard({
  toolCallId,
  kind,
  id,
  currentMarkdown,
  proposedMarkdown,
  confirmDisabled,
  disabled = false,
  loading = false,
  onSubmit
}: {
  toolCallId: string;
  kind: EvidenceKind | null;
  id?: string;
  currentMarkdown: string;
  proposedMarkdown: string;
  confirmDisabled: boolean;
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
  const lines = React.useMemo(
    () => lineDiff(currentMarkdown, proposedMarkdown),
    [currentMarkdown, proposedMarkdown]
  );
  const confirmLocked = confirmDisabled || disabled || submitting != null;

  const handle = React.useCallback(
    (action: "confirm" | "cancel") => {
      if (disabled || submitting != null) return;
      if (action === "confirm" && confirmLocked) return;
      setSubmitting(action);
      void Promise.resolve(onSubmit(action)).catch(() => {
        setSubmitting(null);
      });
    },
    [confirmLocked, disabled, onSubmit, submitting]
  );

  return (
    <ApprovalCard
      title={kind ? evidenceApprovalTitle(kind, id) : "Confirm evidence change"}
      description={
        kind == null
          ? "This evidence proposal could not be read. Cancel to unlock the composer."
          : loading
            ? `Loading current ${kind}…`
            : undefined
      }
      status={submitting != null ? "submitting" : "pending"}
      approveLabel="Confirm"
      rejectLabel="Cancel"
      onApprove={kind ? () => handle("confirm") : undefined}
      onReject={() => handle("cancel")}
      approveDisabled={confirmLocked}
      rejectDisabled={disabled || submitting != null}
      className="w-full max-w-[min(72ch,100%)]"
      data-tool-call-id={toolCallId}
      data-hitl-kind="confirm"
    >
      {kind ? (
        <FileDiff
          file={`${kind}.md`}
          lines={lines}
          status="complete"
          defaultOpen
          collapseOnComplete={false}
          language="text"
          copyText={proposedMarkdown}
          copyLabel="Copy proposed"
          maxHeight={420}
          className="w-full min-w-0"
        />
      ) : null}
    </ApprovalCard>
  );
}
