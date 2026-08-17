"use client";

import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";

import { type OpenEntityFormKind } from "@/features/agent-hub/lib/hub-tool-names";

import { HubHitlFrame } from "./hub-hitl-frame";

export function EntityEditPlanCard({
  toolCallId,
  kind,
  plan,
  creating,
  onSubmit,
  disabled = false
}: {
  toolCallId: string;
  kind: OpenEntityFormKind;
  plan: string | null;
  creating: boolean;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
  disabled?: boolean;
}) {
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
  const noun = kind === "project" ? "project" : kind === "stack" ? "stack" : "experience";
  const title = creating ? `Open new ${noun} form` : `Open ${noun} form`;

  const handle = React.useCallback(
    (action: "confirm" | "cancel") => {
      if (disabled || submitting != null) return;
      if (action === "confirm" && !plan) return;
      setSubmitting(action);
      void Promise.resolve(onSubmit(action)).catch(() => {
        setSubmitting(null);
      });
    },
    [disabled, onSubmit, plan, submitting]
  );

  return (
    <HubHitlFrame
      kind="confirm"
      title={title}
      description={
        plan == null
          ? "This edit proposal could not be read. Cancel to unlock the composer."
          : "Approve this plan to open the original form in the side panel."
      }
      toolCallId={toolCallId}
      submitting={submitting != null}
      footer={
        <>
          {plan ? (
            <Button
              type="button"
              size="sm"
              disabled={disabled || submitting != null}
              onClick={() => handle("confirm")}
            >
              Open form
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
      {plan ? <p className="mt-2 text-sm leading-relaxed text-foreground">{plan}</p> : null}
    </HubHitlFrame>
  );
}
