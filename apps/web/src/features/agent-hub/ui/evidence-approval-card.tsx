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
  op,
  currentMarkdown,
  proposedMarkdown,
  confirmDisabled,
  disabled = false,
  loading = false,
  hint,
  onSubmit,
  completedAction = null
}: {
  toolCallId: string;
  kind: EvidenceKind | null;
  id?: string;
  op?: "create" | "update" | "delete";
  currentMarkdown: string;
  proposedMarkdown: string;
  confirmDisabled: boolean;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
  completedAction?: "confirm" | "cancel" | null;
}) {
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
  const lines = React.useMemo(
    () => lineDiff(currentMarkdown, proposedMarkdown),
    [currentMarkdown, proposedMarkdown]
  );
  const locked = disabled || completedAction != null;
  const confirmLocked = confirmDisabled || locked || submitting != null;

  const handle = React.useCallback(
    (action: "confirm" | "cancel") => {
      if (locked || submitting != null) return;
      if (action === "confirm" && confirmLocked) return;
      setSubmitting(action);
      void Promise.resolve(onSubmit(action)).catch(() => {
        setSubmitting(null);
      });
    },
    [confirmLocked, locked, onSubmit, submitting]
  );

  return (
    <ApprovalCard
      title={kind ? evidenceApprovalTitle(kind, id, op) : "Confirm evidence change"}
      description={
        kind == null
          ? "This evidence proposal could not be read. Cancel to unlock the composer."
          : loading
            ? `Loading current ${kind}…`
            : hint
      }
      status={
        completedAction === "confirm"
          ? "approved"
          : completedAction === "cancel"
            ? "rejected"
            : submitting != null
              ? "submitting"
              : "pending"
      }
      approveLabel={op === "delete" ? "Delete" : "Confirm"}
      approveVariant={op === "delete" ? "destructive" : "default"}
      rejectLabel="Cancel"
      onApprove={completedAction || !kind ? undefined : () => handle("confirm")}
      onReject={completedAction ? undefined : () => handle("cancel")}
      approveDisabled={confirmLocked}
      rejectDisabled={locked || submitting != null}
      result={
        completedAction === "confirm"
          ? op === "delete"
            ? "Deleted."
            : "Saved."
          : completedAction === "cancel"
            ? "No longer pending."
            : undefined
      }
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
