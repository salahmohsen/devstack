"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  describeHardPreferenceDelta,
  type ProposeHardPreferenceChangeInput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";

import { HubHitlFrame } from "./hub-hitl-frame";

export function HardPreferenceConfirmCard({
  toolCallId,
  patch,
  onSubmit,
  disabled = false
}: {
  toolCallId: string;
  patch: ProposeHardPreferenceChangeInput | null;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
  disabled?: boolean;
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
  const view =
    patch && current
      ? describeHardPreferenceDelta(
          {
            excludeKeywords: current.excludeKeywords,
            salaryMin: current.salaryMin ?? null,
            salaryCurrency: current.salaryCurrency ?? null,
            levelFloor: current.levelFloor ?? null
          },
          patch
        )
      : null;
  const confirmLocked = patch == null || disabled || submitting != null || prefs.isLoading || !view;

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
    <HubHitlFrame
      kind="confirm"
      title="Confirm preference change"
      description={
        patch == null
          ? "This preference proposal could not be read. Cancel to unlock the composer."
          : (view?.summary ??
            (prefs.isLoading
              ? "Loading current preferences…"
              : "Hard-stop change needs confirmation."))
      }
      toolCallId={toolCallId}
      submitting={submitting != null}
      footer={
        <>
          {patch ? (
            <Button
              type="button"
              size="sm"
              disabled={confirmLocked}
              onClick={() => handle("confirm")}
            >
              Confirm
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || submitting != null}
            onClick={() => handle("cancel")}
          >
            Cancel
          </Button>
        </>
      }
    >
      {view && view.chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {view.chips.map((chip) => (
            <Badge key={chip} variant="secondary" size="sm" className="font-normal">
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}
    </HubHitlFrame>
  );
}
