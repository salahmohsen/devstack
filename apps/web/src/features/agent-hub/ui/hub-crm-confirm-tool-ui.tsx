"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_OUTCOME_LABELS,
  type ProposeBatchGeneratePackagesInput,
  type ProposeBatchGeneratePackagesOutput,
  type ProposeBatchTrackingChangeInput,
  type ProposeBatchTrackingChangeOutput,
  type ProposeDeleteApplicationInput,
  type ProposeDeleteApplicationOutput,
  type ProposeDeleteNoteInput,
  type ProposeDeleteNoteOutput,
  type ProposeRefreshFromUrlInput,
  type ProposeRefreshFromUrlOutput,
  type ProposeSetOutcomeInput,
  type ProposeSetOutcomeOutput
} from "@tsu-stack/core";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";

import { startBatchGeneratePackagesJob } from "@/features/agent-hub/api/batch-generate-packages-job";
import {
  useDismissInboxJobMutation,
  usePromoteInboxJobMutation
} from "@/features/agent-hub/api/create-from-jd.mutation";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  isHubHitlAbandonedOnRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";
import {
  isProposeBatchGeneratePackagesToolName,
  isProposeBatchTrackingChangeToolName,
  isProposeDeleteApplicationToolName,
  isProposeDeleteNoteToolName,
  isProposeRefreshFromUrlToolName,
  isProposeSetOutcomeToolName,
  parseProposeBatchGeneratePackagesInput,
  parseProposeBatchGeneratePackagesOutput,
  parseProposeBatchTrackingChangeInput,
  parseProposeBatchTrackingChangeOutput,
  parseProposeDeleteApplicationInput,
  parseProposeDeleteApplicationOutput,
  parseProposeDeleteNoteInput,
  parseProposeDeleteNoteOutput,
  parseProposeRefreshFromUrlInput,
  parseProposeRefreshFromUrlOutput,
  parseProposeSetOutcomeInput,
  parseProposeSetOutcomeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

function useHubConfirmLifecycle(toolCallId: string) {
  const { addToolOutput, messages } = useHubChat();
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const abandoned = React.useSyncExternalStore(
    subscribeHubHitlRemount,
    () => isHubHitlAbandonedOnRemount(toolCallId),
    () => false
  );
  return { addToolOutput, onLatest, abandoned };
}

function HubCrmConfirmCard({
  toolCallId,
  title,
  description,
  extra,
  destructive = false,
  confirmLabel = "Confirm",
  disabled = false,
  completedAction = null,
  onSubmit
}: {
  toolCallId: string;
  title: string;
  description?: string;
  extra?: React.ReactNode;
  destructive?: boolean;
  confirmLabel?: string;
  disabled?: boolean;
  completedAction?: "confirm" | "cancel" | null;
  onSubmit: (action: "confirm" | "cancel") => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState<"confirm" | "cancel" | null>(null);
  const locked = disabled || completedAction != null;

  const handle = React.useCallback(
    (action: "confirm" | "cancel") => {
      if (locked || submitting != null) return;
      setSubmitting(action);
      void Promise.resolve(onSubmit(action)).catch(() => {
        setSubmitting(null);
      });
    },
    [locked, onSubmit, submitting]
  );

  return (
    <ApprovalCard
      title={title}
      description={description}
      status={
        completedAction === "confirm"
          ? "approved"
          : completedAction === "cancel"
            ? "rejected"
            : submitting != null
              ? "submitting"
              : "pending"
      }
      approveLabel={confirmLabel}
      approveVariant={destructive ? "destructive" : "default"}
      rejectLabel="Cancel"
      onApprove={completedAction ? undefined : () => handle("confirm")}
      onReject={completedAction ? undefined : () => handle("cancel")}
      approveDisabled={locked || submitting != null}
      rejectDisabled={locked || submitting != null}
      result={
        completedAction === "confirm"
          ? "Done."
          : completedAction === "cancel"
            ? "No longer pending."
            : undefined
      }
      className="w-full max-w-[min(72ch,100%)]"
      data-tool-call-id={toolCallId}
      data-hitl-kind="confirm"
    >
      {extra}
    </ApprovalCard>
  );
}

function roleLabel(input: { companyName?: string; title?: string }): string {
  const company = input.companyName?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  if (company && title) return `${title} at ${company}`;
  return company || title || "this application";
}

export function ProposeSetOutcomeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeSetOutcomeInput, ProposeSetOutcomeOutput>) {
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const input = parseProposeSetOutcomeInput(args);
  const completed = parseProposeSetOutcomeOutput(result);
  const resolvedToolName = isProposeSetOutcomeToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-set-outcome";

  const complete = React.useCallback(
    (output: ProposeSetOutcomeOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
  }, [abandoned, complete, completed, input?.applicationId, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);
  const outcomeLabel = input ? APPLICATION_OUTCOME_LABELS[input.outcome] : "close";

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input) {
        complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
        return;
      }
      await orpcClient.applications.setOutcome({
        id: input.applicationId,
        outcome: input.outcome
      });
      complete({ action: "confirm", applicationId: input.applicationId });
    },
    [complete, input]
  );

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting to close an application…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Close application?"
        description="This close proposal could not be read. Cancel to unlock the composer."
        disabled
        onSubmit={() => complete({ action: "cancel", applicationId: "" })}
      />
    );
  }

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title={`Close ${roleLabel(input)} as ${outcomeLabel}?`}
      description={`Confirm sets the outcome to ${outcomeLabel}. Stage stays as it is.`}
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}

export function ProposeDeleteApplicationToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeDeleteApplicationInput, ProposeDeleteApplicationOutput>) {
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const input = parseProposeDeleteApplicationInput(args);
  const completed = parseProposeDeleteApplicationOutput(result);
  const resolvedToolName = isProposeDeleteApplicationToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-delete-application";

  const complete = React.useCallback(
    (output: ProposeDeleteApplicationOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
  }, [abandoned, complete, completed, input?.applicationId, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input) {
        complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
        return;
      }
      await orpcClient.applications.delete({ ids: [input.applicationId] });
      complete({ action: "confirm", applicationId: input.applicationId });
    },
    [complete, input]
  );

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting to delete an application…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Delete application?"
        description="This delete proposal could not be read. Cancel to unlock the composer."
        destructive
        confirmLabel="Delete"
        disabled
        onSubmit={() => complete({ action: "cancel", applicationId: "" })}
      />
    );
  }

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title={`Delete ${roleLabel(input)}?`}
      description="This permanently deletes the application. Cancel writes nothing."
      destructive
      confirmLabel="Delete"
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}

export function ProposeDeleteNoteToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeDeleteNoteInput, ProposeDeleteNoteOutput>) {
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const input = parseProposeDeleteNoteInput(args);
  const completed = parseProposeDeleteNoteOutput(result);
  const resolvedToolName = isProposeDeleteNoteToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-delete-note";

  const complete = React.useCallback(
    (output: ProposeDeleteNoteOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", noteId: input?.noteId ?? "" });
  }, [abandoned, complete, completed, input?.noteId, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input || input.kind !== "note") {
        complete({ action: "cancel", noteId: input?.noteId ?? "" });
        return;
      }
      await orpcClient.applications.deleteNote({
        id: input.noteId,
        applicationId: input.applicationId
      });
      complete({ action: "confirm", noteId: input.noteId });
    },
    [complete, input]
  );

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting to delete a note…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Delete note?"
        description="This note proposal could not be read. Cancel to unlock the composer."
        destructive
        confirmLabel="Delete"
        disabled
        onSubmit={() => complete({ action: "cancel", noteId: "" })}
      />
    );
  }

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title="Delete this note?"
      description={
        input.preview?.trim()
          ? `This removes the activity note. Preview: ${input.preview.trim()}`
          : "This removes the activity note. Cancel writes nothing."
      }
      destructive
      confirmLabel="Delete"
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}

export function ProposeBatchTrackingChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeBatchTrackingChangeInput, ProposeBatchTrackingChangeOutput>) {
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const promote = usePromoteInboxJobMutation();
  const dismiss = useDismissInboxJobMutation();
  const input = parseProposeBatchTrackingChangeInput(args);
  const completed = parseProposeBatchTrackingChangeOutput(result);
  const resolvedToolName = isProposeBatchTrackingChangeToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-batch-tracking-change";

  const complete = React.useCallback(
    (output: ProposeBatchTrackingChangeOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({
      action: "cancel",
      trackingAction: input?.trackingAction ?? "track",
      ids: input?.ids ?? []
    });
  }, [abandoned, complete, completed, input, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input) {
        complete({
          action: "cancel",
          trackingAction: input?.trackingAction ?? "track",
          ids: input?.ids ?? []
        });
        return;
      }
      await Promise.all(
        input.ids.map((id) => {
          if (input.trackingAction === "track") return promote.mutateAsync({ id });
          if (input.trackingAction === "dismiss") return dismiss.mutateAsync({ id });
          return orpcClient.applications.restore({ id });
        })
      );
      complete({
        action: "confirm",
        trackingAction: input.trackingAction,
        ids: input.ids
      });
    },
    [complete, dismiss, input, promote]
  );

  const verb =
    input?.trackingAction === "dismiss"
      ? "Dismiss"
      : input?.trackingAction === "restore"
        ? "Restore"
        : "Track";

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting for a batch tracking proposal…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Batch tracking change?"
        description="This batch proposal could not be read. Cancel to unlock the composer."
        disabled
        onSubmit={() => complete({ action: "cancel", trackingAction: "track", ids: [] })}
      />
    );
  }

  const labelById = new Map((input.labels ?? []).map((row) => [row.id, row]));
  const extra = (
    <ul className="m-0 list-none space-y-1 p-0 text-xs text-muted-foreground">
      {input.ids.map((id) => {
        const row = labelById.get(id);
        const label = row ? roleLabel(row) : id;
        return (
          <li key={id} className="truncate">
            {label}
          </li>
        );
      })}
    </ul>
  );

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title={`${verb} ${input.ids.length} job${input.ids.length === 1 ? "" : "s"}?`}
      description={`Confirm runs ${input.trackingAction} on each id. Cancel writes nothing.`}
      extra={extra}
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}

export function ProposeBatchGeneratePackagesToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<
  ProposeBatchGeneratePackagesInput,
  ProposeBatchGeneratePackagesOutput
>) {
  const queryClient = useQueryClient();
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const input = parseProposeBatchGeneratePackagesInput(args);
  const completed = parseProposeBatchGeneratePackagesOutput(result);
  const resolvedToolName = isProposeBatchGeneratePackagesToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-batch-generate-packages";

  const complete = React.useCallback(
    (output: ProposeBatchGeneratePackagesOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", ids: input?.ids ?? [] });
  }, [abandoned, complete, completed, input?.ids, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  const handleSubmit = React.useCallback(
    (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input) {
        complete({ action: "cancel", ids: input?.ids ?? [] });
        return;
      }
      // Complete HITL immediately — do not await generates on the Confirm button.
      complete({ action: "confirm", ids: input.ids });
      startBatchGeneratePackagesJob(queryClient, input.ids, input.labels ?? []);
    },
    [complete, input, queryClient]
  );

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting for a package proposal…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Confirm packages?"
        description="This package proposal could not be read. Cancel to unlock the composer."
        disabled
        onSubmit={() => complete({ action: "cancel", ids: [] })}
      />
    );
  }

  const labelById = new Map((input.labels ?? []).map((row) => [row.id, row]));
  const extra = (
    <ul className="m-0 list-none space-y-1 p-0 text-xs text-muted-foreground">
      {input.ids.map((id) => {
        const row = labelById.get(id);
        const label = row ? roleLabel(row) : id;
        return (
          <li key={id} className="truncate">
            {label}
          </li>
        );
      })}
    </ul>
  );

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title={`Confirm package for ${input.ids.length} tracked job${input.ids.length === 1 ? "" : "s"}`}
      description="Confirm drafts resume and letter packages. Progress shows in the AI island — jobs that already have a draft are marked ready."
      extra={extra}
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}

export function ProposeRefreshFromUrlToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeRefreshFromUrlInput, ProposeRefreshFromUrlOutput>) {
  const { addToolOutput, onLatest, abandoned } = useHubConfirmLifecycle(toolCallId);
  const input = parseProposeRefreshFromUrlInput(args);
  const completed = parseProposeRefreshFromUrlOutput(result);
  const resolvedToolName = isProposeRefreshFromUrlToolName(toolName ?? "")
    ? (toolName as string)
    : "propose-refresh-from-url";

  const complete = React.useCallback(
    (output: ProposeRefreshFromUrlOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({ tool: resolvedToolName, toolCallId, output });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
  }, [abandoned, complete, completed, input?.applicationId, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !input) {
        complete({ action: "cancel", applicationId: input?.applicationId ?? "" });
        return;
      }
      await orpcClient.applications.refreshFromListingUrl({
        id: input.applicationId,
        url: input.url
      });
      complete({ action: "confirm", applicationId: input.applicationId });
    },
    [complete, input]
  );

  if (!input) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting to refresh a listing…
        </p>
      );
    }
    return (
      <HubCrmConfirmCard
        toolCallId={toolCallId}
        title="Refresh listing from URL?"
        description="This refresh proposal could not be read. Cancel to unlock the composer."
        disabled
        onSubmit={() => complete({ action: "cancel", applicationId: "" })}
      />
    );
  }

  return (
    <HubCrmConfirmCard
      toolCallId={toolCallId}
      title={`Refresh ${roleLabel(input)} from URL?`}
      description={`Re-fetch listing details from ${input.url}.`}
      disabled={result != null || !toolCallId}
      completedAction={receiptAction}
      onSubmit={handleSubmit}
    />
  );
}
