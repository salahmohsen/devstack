"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateEducationInputSchema,
  UpdateEducationInputSchema,
  type ProposeEducationChangeInput,
  type ProposeEducationChangeOutput
} from "@tsu-stack/core";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  isHubHitlAbandonedOnRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";
import {
  isProposeEducationChangeToolName,
  parseProposeEducationChangeInput,
  parseProposeEducationChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

const TOOL_ID = "propose-education-change";

const CURRENT_ROW_QUERY = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false
};

const PATCH_FIELD_LABELS: Record<string, string> = {
  school: "School",
  degree: "Degree",
  field: "Field",
  location: "Location",
  fromDate: "From",
  toDate: "To",
  isPresent: "Currently enrolled",
  description: "Description",
  gpa: "GPA"
};

export function EducationChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeEducationChangeInput, ProposeEducationChangeOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const queryClient = useQueryClient();
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const abandoned = React.useSyncExternalStore(
    subscribeHubHitlRemount,
    () => isHubHitlAbandonedOnRemount(toolCallId),
    () => false
  );
  const proposal = parseProposeEducationChangeInput(args);
  const completed = parseProposeEducationChangeOutput(result);
  const resolvedToolName = isProposeEducationChangeToolName(toolName ?? "")
    ? (toolName as string)
    : TOOL_ID;
  const op = proposal?.op ?? "update";
  const id = proposal?.id;
  const isDelete = op === "delete";

  const currentQuery = useQuery({
    ...orpcQueryClient.educations.get.queryOptions({ input: { id: id ?? "" } }),
    ...CURRENT_ROW_QUERY,
    enabled: Boolean(id) && op === "update"
  });

  const createParsed =
    proposal && op === "create" ? CreateEducationInputSchema.safeParse(proposal.patch) : null;
  const updateParsed =
    proposal && op === "update" ? UpdateEducationInputSchema.safeParse(proposal.patch) : null;
  const confirmDisabled =
    proposal == null ||
    (isDelete
      ? !id
      : op === "create"
        ? !createParsed?.success
        : !updateParsed?.success || Object.keys(proposal.patch).length === 0) ||
    (op === "update" &&
      (currentQuery.isLoading || currentQuery.isError || currentQuery.data == null));

  const complete = React.useCallback(
    (output: ProposeEducationChangeOutput) => {
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
      if (action === "cancel" || !proposal) {
        complete({ action: "cancel", kind: "education", ...(id ? { id } : {}) });
        return;
      }
      if (isDelete) {
        if (!id) throw new Error("Education id is required to delete");
        await orpcClient.educations.delete({ id });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.educations.list.key()
        });
        complete({ action: "confirm", kind: "education", id });
        return;
      }
      if (op === "create") {
        if (!createParsed?.success) throw new Error("Education change is not ready to write");
        const created = await orpcClient.educations.create(createParsed.data);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.educations.list.key()
        });
        complete({ action: "confirm", kind: "education", id: created.id });
        return;
      }
      if (!updateParsed?.success) throw new Error("Education change is not ready to write");
      if (!id) throw new Error("Education id is required to update");
      const updated = await orpcClient.educations.update({ id, data: updateParsed.data });
      await queryClient.invalidateQueries({
        queryKey: orpcQueryClient.educations.list.key()
      });
      await queryClient.invalidateQueries({
        queryKey: orpcQueryClient.educations.get.queryKey({ input: { id } })
      });
      complete({ action: "confirm", kind: "education", id: updated?.id ?? id });
    },
    [complete, createParsed, id, isDelete, op, proposal, queryClient, updateParsed]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", kind: "education", ...(id ? { id } : {}) });
  }, [abandoned, complete, completed, id, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);
  const currentRow = op === "update" && id ? currentQuery.data : null;

  if (receiptAction) {
    if (!proposal) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          {receiptAction === "confirm"
            ? isDelete
              ? "Deleted education entry."
              : "Saved education change."
            : "No longer pending."}
        </p>
      );
    }
    return (
      <EducationChangeCard
        toolCallId={toolCallId}
        op={op}
        patch={proposal.patch}
        currentRow={currentRow}
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
          Waiting for an education proposal…
        </p>
      );
    }
    return (
      <EducationChangeCard
        toolCallId={toolCallId}
        op={op}
        patch={{}}
        currentRow={null}
        confirmDisabled
        disabled={result != null || !toolCallId}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <EducationChangeCard
      toolCallId={toolCallId}
      op={op}
      patch={proposal.patch}
      currentRow={currentRow}
      confirmDisabled={confirmDisabled}
      loading={op === "update" && currentQuery.isLoading}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

function EducationChangeCard({
  toolCallId,
  op,
  patch,
  currentRow,
  confirmDisabled,
  loading = false,
  disabled = false,
  onSubmit,
  completedAction = null
}: {
  toolCallId: string;
  op: "create" | "update" | "delete";
  patch: Record<string, unknown>;
  currentRow: { school: string; degree: string } | null | undefined;
  confirmDisabled: boolean;
  loading?: boolean;
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

  const title =
    op === "create"
      ? "Confirm education entry"
      : op === "delete"
        ? "Confirm education deletion"
        : "Confirm education change";

  return (
    <ApprovalCard
      title={title}
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
          ? "Saved."
          : completedAction === "cancel"
            ? "No longer pending."
            : undefined
      }
      className="w-full max-w-[min(72ch,100%)]"
      data-tool-call-id={toolCallId}
      data-hitl-kind="confirm"
    >
      {op === "update" && currentRow ? (
        <p className="text-xs text-muted-foreground">
          Editing <span className="font-medium text-foreground">{currentRow.school}</span> —{" "}
          {currentRow.degree}
        </p>
      ) : null}
      {op === "delete" ? (
        <p className="text-sm text-foreground">
          This education entry will be removed from your profile and future generated resumes.
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => (
              <React.Fragment key={key}>
                <dt className="text-muted-foreground">{PATCH_FIELD_LABELS[key] ?? key}</dt>
                <dd className="min-w-0 wrap-break-word text-foreground">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                </dd>
              </React.Fragment>
            ))}
        </dl>
      )}
      {loading ? <p className="text-xs text-muted-foreground">Loading current entry…</p> : null}
    </ApprovalCard>
  );
}
