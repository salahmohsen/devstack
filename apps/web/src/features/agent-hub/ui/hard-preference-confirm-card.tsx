"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  applyHardJobPreferencePatch,
  describeHardPreferenceDelta,
  renderSearchBriefMarkdown,
  searchBriefPrefsFromPreference,
  type ProposeHardPreferenceChangeInput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";
import { FileDiff, lineDiff } from "@/shared/ui/agents/file-diff";

export function HardPreferenceConfirmCard({
  toolCallId,
  patch,
  onSubmit,
  disabled = false,
  completedAction = null
}: {
  toolCallId: string;
  patch: ProposeHardPreferenceChangeInput | null;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
  disabled?: boolean;
  completedAction?: "confirm" | "cancel" | null;
}) {
  const prefs = useQuery({
    ...orpcQueryClient.jobPreference.get.queryOptions({
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }),
    enabled: patch != null
  });
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
  const current = prefs.data;
  const preview = React.useMemo(() => {
    if (!patch || !current) return null;
    const hardCurrent = {
      excludeKeywords: current.excludeKeywords,
      salaryMin: current.salaryMin ?? null,
      salaryCurrency: current.salaryCurrency ?? null,
      levelFloor: current.levelFloor ?? null
    };
    const currentPrefs = searchBriefPrefsFromPreference(current);
    const currentMd = renderSearchBriefMarkdown({ prefs: currentPrefs });
    const nextPrefs = applyHardJobPreferencePatch(hardCurrent, patch);
    const proposedMd = renderSearchBriefMarkdown({
      prefs: {
        ...currentPrefs,
        excludeKeywords: nextPrefs.excludeKeywords ?? currentPrefs.excludeKeywords,
        salaryMin: nextPrefs.salaryMin !== undefined ? nextPrefs.salaryMin : currentPrefs.salaryMin,
        salaryCurrency:
          nextPrefs.salaryCurrency !== undefined
            ? nextPrefs.salaryCurrency
            : currentPrefs.salaryCurrency,
        levelFloor:
          nextPrefs.levelFloor !== undefined ? nextPrefs.levelFloor : currentPrefs.levelFloor
      }
    });
    return {
      proposedMd,
      lines: lineDiff(currentMd, proposedMd),
      view: describeHardPreferenceDelta(hardCurrent, patch)
    };
  }, [current, patch]);
  const locked = disabled || completedAction != null;
  const confirmLocked =
    patch == null || locked || submitting != null || prefs.isLoading || !preview;

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
      title="Confirm preference change"
      description={
        patch == null
          ? "This preference proposal could not be read. Cancel to unlock the composer."
          : prefs.isLoading
            ? "Loading current preferences…"
            : undefined
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
      approveLabel="Confirm"
      rejectLabel="Cancel"
      onApprove={completedAction || !patch ? undefined : () => handle("confirm")}
      onReject={completedAction ? undefined : () => handle("cancel")}
      approveDisabled={confirmLocked}
      rejectDisabled={locked || submitting != null}
      result={
        completedAction === "confirm"
          ? "Updated hard-stop preferences."
          : completedAction === "cancel"
            ? "No longer pending."
            : undefined
      }
      className="w-full max-w-[min(72ch,100%)]"
      data-tool-call-id={toolCallId}
      data-hitl-kind="confirm"
    >
      {preview ? (
        <>
          <FileDiff
            file="search-brief.md"
            lines={preview.lines}
            status="complete"
            defaultOpen
            collapseOnComplete={false}
            language="text"
            copyText={preview.proposedMd}
            copyLabel="Copy proposed"
            maxHeight={420}
            className="w-full min-w-0"
          />
          {preview.view.chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {preview.view.chips.map((chip) => (
                <Badge key={chip} variant="secondary" size="sm" className="font-normal">
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </ApprovalCard>
  );
}
