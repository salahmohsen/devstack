"use client";

import * as React from "react";

import { type ProposeMailCrmChangeInput, type ProposeMailCrmChangeOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";

import { HubHitlFrame } from "./hub-hitl-frame";

function confirmCopy(input: ProposeMailCrmChangeInput): { title: string; body: string } {
  const role = `${input.title} at ${input.companyName}`;
  if (input.intent === "close_rejected") {
    return {
      title: `Close ${input.companyName}?`,
      body: `Latest mail looks like a rejection. Close ${role} as rejected. Stage stays as it is.`
    };
  }
  if (input.intent === "create_applied") {
    return {
      title: `Track ${input.companyName} as applied?`,
      body: `No tracked row yet. Confirm creates ${role} and sets it to applied.`
    };
  }
  if (input.intent === "track_applied") {
    return {
      title: `Move ${input.companyName} to applied?`,
      body: `${role} is in New jobs. Confirm tracks it and sets applied.`
    };
  }
  const stage = input.targetStage ?? "the next stage";
  return {
    title: `Update ${input.companyName}?`,
    body: `Confirm moves ${role} to ${stage}.`
  };
}

export function MailCrmChangeCard({
  toolCallId,
  input,
  onSubmit,
  disabled = false
}: {
  toolCallId: string;
  input: ProposeMailCrmChangeInput;
  onSubmit: (output: ProposeMailCrmChangeOutput) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const copy = confirmCopy(input);
  const subject = input.mailSubject?.trim();

  return (
    <HubHitlFrame
      kind="confirm"
      toolCallId={toolCallId}
      title={copy.title}
      description={copy.body}
      submitting={busy}
      footer={
        <>
          <Button
            type="button"
            size="sm"
            disabled={disabled || busy}
            onClick={() => {
              setBusy(true);
              void Promise.resolve(
                onSubmit({ action: "confirm", applicationId: input.applicationId })
              ).catch(() => {
                setBusy(false);
              });
            }}
          >
            Confirm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => {
              setBusy(true);
              void Promise.resolve(onSubmit({ action: "cancel" })).catch(() => {
                setBusy(false);
              });
            }}
          >
            Cancel
          </Button>
        </>
      }
    >
      {subject ? <p className="mt-2 text-xs text-muted-foreground">Mail: {subject}</p> : null}
      {input.reason?.trim() ? (
        <p className="mt-1 text-xs text-muted-foreground">{input.reason.trim()}</p>
      ) : null}
    </HubHitlFrame>
  );
}
