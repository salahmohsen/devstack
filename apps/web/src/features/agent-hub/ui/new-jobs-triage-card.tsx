"use client";

import * as React from "react";

import { type ProposeNewJobsTriageOutput, type ProposeNewJobsTriageRow } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";

import { HubHitlFrame } from "./hub-hitl-frame";

export type NewJobsTriageCardInput = {
  track: ProposeNewJobsTriageRow[];
  dismiss: ProposeNewJobsTriageRow[];
};

export type NewJobsTriageCardAction = ProposeNewJobsTriageOutput["action"];

export type NewJobsTriageCardProps = {
  toolCallId: string;
  input: NewJobsTriageCardInput;
  onSubmit: (output: ProposeNewJobsTriageOutput) => void | Promise<void>;
  /** Receipt — keep the lists, drop Confirm/Cancel. Same pattern as the JD card. */
  completedAction?: NewJobsTriageCardAction | null;
  disabled?: boolean;
  className?: string;
};

function RowList({
  label,
  rows,
  checked,
  onToggle,
  locked
}: {
  label: string;
  rows: ProposeNewJobsTriageRow[];
  checked: Set<string>;
  onToggle: (id: string) => void;
  locked: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </h4>
        <p className="text-sm text-muted-foreground italic">None proposed</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </h4>
      <ul className="space-y-2">
        {rows.map((row) => {
          const isOn = checked.has(row.id);
          return (
            <li
              key={row.id}
              className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 px-2.5 py-2"
            >
              <Checkbox
                checked={isOn}
                disabled={locked}
                onCheckedChange={() => onToggle(row.id)}
                aria-label={`${label}: ${row.title} at ${row.companyName}`}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm leading-snug font-medium text-foreground">
                  {row.title.trim() || "Untitled role"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.companyName.trim() || "Unknown company"}
                  {typeof row.matchScore === "number"
                    ? ` · Match ${Math.round(row.matchScore)}%`
                    : null}
                </p>
                {row.reason?.trim() ? (
                  <p className="text-xs leading-relaxed text-foreground/80">{row.reason.trim()}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Client HITL card for propose-new-jobs-triage: Track + Dismiss lists with uncheck.
 */
export function NewJobsTriageCard({
  toolCallId,
  input,
  onSubmit,
  completedAction = null,
  disabled = false,
  className
}: NewJobsTriageCardProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const locked = disabled || submitting || completedAction != null;

  const [trackChecked, setTrackChecked] = React.useState(
    () => new Set(input.track.map((r) => r.id))
  );
  const [dismissChecked, setDismissChecked] = React.useState(
    () => new Set(input.dismiss.map((r) => r.id))
  );

  const toggleTrack = React.useCallback((id: string) => {
    setTrackChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDismiss = React.useCallback((id: string) => {
    setDismissChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (locked) return;
    setSubmitting(true);
    void Promise.resolve(
      onSubmit({
        action: "confirm",
        trackIds: input.track.map((r) => r.id).filter((id) => trackChecked.has(id)),
        dismissIds: input.dismiss.map((r) => r.id).filter((id) => dismissChecked.has(id))
      })
    ).catch(() => {
      setSubmitting(false);
    });
  }, [dismissChecked, input.dismiss, input.track, locked, onSubmit, trackChecked]);

  const handleCancel = React.useCallback(() => {
    if (locked) return;
    setSubmitting(true);
    void Promise.resolve(onSubmit({ action: "cancel", trackIds: [], dismissIds: [] })).catch(() => {
      setSubmitting(false);
    });
  }, [locked, onSubmit]);

  const receipt =
    completedAction === "cancel"
      ? "Cancelled."
      : completedAction === "confirm"
        ? "Confirmed."
        : null;

  return (
    <HubHitlFrame
      kind="recommendation"
      title="New jobs triage"
      description={
        completedAction
          ? null
          : "Uncheck anything you want to skip, then confirm. No jobs change until you confirm."
      }
      aside={
        completedAction ? (
          <Badge
            variant={completedAction === "cancel" ? "secondary" : "success"}
            size="sm"
            className="font-normal"
          >
            {completedAction === "cancel" ? "Cancelled" : "Confirmed"}
          </Badge>
        ) : null
      }
      toolCallId={toolCallId}
      submitting={submitting && !disabled && completedAction == null}
      className={className}
      footer={
        receipt ? (
          <p className="m-0 text-xs text-muted-foreground">{receipt}</p>
        ) : (
          <>
            <Button type="button" size="sm" disabled={locked} onClick={handleConfirm} autoFocus>
              Confirm triage
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={locked}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <RowList
          label="Track"
          rows={input.track}
          checked={trackChecked}
          onToggle={toggleTrack}
          locked={locked}
        />
        <RowList
          label="Dismiss"
          rows={input.dismiss}
          checked={dismissChecked}
          onToggle={toggleDismiss}
          locked={locked}
        />
      </div>
    </HubHitlFrame>
  );
}
