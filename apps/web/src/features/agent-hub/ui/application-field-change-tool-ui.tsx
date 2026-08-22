"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  UpdateApplicationInputSchema,
  type ProposeApplicationFieldChangeInput,
  type ProposeApplicationFieldChangeOutput
} from "@tsu-stack/core";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";
import { FileDiff, lineDiff } from "@/shared/ui/agents/file-diff";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  isHubHitlAbandonedOnRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";
import {
  isProposeApplicationFieldChangeToolName,
  parseProposeApplicationFieldChangeInput,
  parseProposeApplicationFieldChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

const TOOL_ID = "propose-application-field-change";

export function ApplicationFieldChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<
  ProposeApplicationFieldChangeInput,
  ProposeApplicationFieldChangeOutput
>) {
  const { addToolOutput, messages } = useHubChat();
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const abandoned = React.useSyncExternalStore(
    subscribeHubHitlRemount,
    () => isHubHitlAbandonedOnRemount(toolCallId),
    () => false
  );
  const proposal = parseProposeApplicationFieldChangeInput(args);
  const completed = parseProposeApplicationFieldChangeOutput(result);
  const resolvedToolName = isProposeApplicationFieldChangeToolName(toolName ?? "")
    ? (toolName as string)
    : TOOL_ID;
  const patchParsed = proposal
    ? UpdateApplicationInputSchema.safeParse(proposal.patch)
    : { success: false as const };
  const confirmDisabled =
    proposal == null ||
    proposal.proposedMarkdown.trim().length === 0 ||
    !patchParsed.success ||
    Object.keys(proposal.patch).length === 0;

  const complete = React.useCallback(
    (output: ProposeApplicationFieldChangeOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !proposal || !patchParsed.success) {
        complete({
          action: "cancel",
          applicationId: proposal?.applicationId ?? ""
        });
        return;
      }
      await orpcClient.applications.update({
        id: proposal.applicationId,
        data: patchParsed.data
      });
      complete({ action: "confirm", applicationId: proposal.applicationId });
    },
    [complete, patchParsed, proposal]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({
      action: "cancel",
      applicationId: proposal?.applicationId ?? ""
    });
  }, [abandoned, complete, completed, onLatest, proposal?.applicationId, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);
  const lines = React.useMemo(
    () => lineDiff(proposal?.currentMarkdown ?? "", proposal?.proposedMarkdown ?? ""),
    [proposal?.currentMarkdown, proposal?.proposedMarkdown]
  );

  if (receiptAction) {
    if (!proposal) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          {receiptAction === "confirm" ? "Updated application." : "No longer pending."}
        </p>
      );
    }
    return (
      <ApplicationFieldChangeCard
        toolCallId={toolCallId}
        proposedMarkdown={proposal.proposedMarkdown}
        lines={lines}
        confirmDisabled
        completedAction={receiptAction}
        disabled
        onSubmit={() => undefined}
      />
    );
  }

  if (!proposal) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting for an application field proposal…
        </p>
      );
    }
    return (
      <ApplicationFieldChangeCard
        toolCallId={toolCallId}
        proposedMarkdown=""
        lines={[]}
        confirmDisabled
        disabled={result != null || !toolCallId}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <ApplicationFieldChangeCard
      toolCallId={toolCallId}
      proposedMarkdown={proposal.proposedMarkdown}
      lines={lines}
      confirmDisabled={confirmDisabled}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

function ApplicationFieldChangeCard({
  toolCallId,
  proposedMarkdown,
  lines,
  confirmDisabled,
  disabled = false,
  onSubmit,
  completedAction = null
}: {
  toolCallId: string;
  proposedMarkdown: string;
  lines: ReturnType<typeof lineDiff>;
  confirmDisabled: boolean;
  disabled?: boolean;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
  completedAction?: "confirm" | "cancel" | null;
}) {
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
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
      title="Confirm application change"
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
      onApprove={completedAction ? undefined : () => handle("confirm")}
      onReject={completedAction ? undefined : () => handle("cancel")}
      approveDisabled={confirmLocked}
      rejectDisabled={locked || submitting != null}
      result={
        completedAction === "confirm"
          ? "Updated."
          : completedAction === "cancel"
            ? "No longer pending."
            : undefined
      }
      className="w-full max-w-[min(72ch,100%)]"
      data-tool-call-id={toolCallId}
      data-hitl-kind="confirm"
    >
      {proposedMarkdown ? (
        <FileDiff
          file="application.md"
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
