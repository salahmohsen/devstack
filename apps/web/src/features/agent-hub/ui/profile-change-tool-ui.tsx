"use client";

import { useQuery, useQueryClient, type QueryFunction } from "@tanstack/react-query";
import * as React from "react";

import { ApprovalCard } from "@/shared/ui/agents/approval-card";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  isHubHitlAbandonedOnRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";

const CURRENT_ROW_QUERY = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false
};

export type ProfileChangeOp = "create" | "update" | "delete";

/** Shape shared by every `Propose*ChangeInput` schema output. */
export type ProfileChangeProposal = {
  op: ProfileChangeOp;
  id?: string;
  patch: Record<string, unknown>;
};

/** Shape shared by every `Propose*ChangeOutput` schema output. */
export type ProfileChangeReceipt = {
  action: "confirm" | "cancel";
  id?: string;
};

type SafeParseResult<T> = { success: true; data: T } | { success: false };

export type ProfileChangeCopy = {
  waitingProposal: string;
  savedReceipt: string;
  deletedReceipt: string;
  deleteWarning: string;
  titles: { create: string; update: string; delete: string };
  errors: {
    deleteIdRequired: string;
    writeNotReady: string;
    updateIdRequired: string;
  };
};

/**
 * Per-entity wiring for the profile propose-change confirm cards (education,
 * certification). `ProfileChangeToolUI` owns the parse/complete/auto-cancel/
 * current-row/submit/card shell; the config owns the entity-specific schemas,
 * oRPC paths, labels, and copy.
 */
export type ProfileChangeEntityConfig<
  TProposal extends ProfileChangeProposal,
  TReceipt extends ProfileChangeReceipt,
  TCreate,
  TUpdate,
  TRow
> = {
  /** Mastra tool id, used when the stream part carries no known toolName. */
  toolId: string;
  isToolName: (name: string) => boolean;
  parseInput: (input: unknown) => TProposal | null;
  parseOutput: (output: unknown) => TReceipt | null;
  /** Receipt factory so confirm/cancel outputs keep the entity `kind` literal. */
  receipt: (action: "confirm" | "cancel", id?: string) => TReceipt;
  /** oRPC get-by-id options for the row this proposal targets. */
  rowQueryOptions: (id: string) => {
    queryKey: readonly unknown[];
    queryFn: QueryFunction<TRow | null>;
  };
  listQueryKey: () => readonly unknown[];
  rowQueryKey: (id: string) => readonly unknown[];
  createSchema: { safeParse: (data: unknown) => SafeParseResult<TCreate> };
  updateSchema: { safeParse: (data: unknown) => SafeParseResult<TUpdate> };
  createRow: (data: TCreate) => Promise<{ id: string }>;
  updateRow: (id: string, data: TUpdate) => Promise<{ id?: string } | null | undefined>;
  deleteRow: (id: string) => Promise<unknown>;
  fieldLabels: Record<string, string>;
  /** Row fields shown as "primary — secondary" on update/delete cards. */
  rowPrimary: (row: TRow) => string;
  rowSecondary: (row: TRow) => string;
  /** Custom patch value rendering (certification links credentialUrl). */
  renderPatchValue?: (key: string, value: unknown) => React.ReactNode;
  copy: ProfileChangeCopy;
};

export type ProfileChangeToolUIProps<
  TProposal extends ProfileChangeProposal,
  TReceipt extends ProfileChangeReceipt,
  TCreate,
  TUpdate,
  TRow
> = {
  config: ProfileChangeEntityConfig<TProposal, TReceipt, TCreate, TUpdate, TRow>;
  args: unknown;
  result?: unknown;
  addResult?: (result: TReceipt) => void;
  toolCallId: string;
  toolName?: string;
  status?: { type: string } | undefined;
};

export function ProfileChangeToolUI<
  TProposal extends ProfileChangeProposal,
  TReceipt extends ProfileChangeReceipt,
  TCreate,
  TUpdate,
  TRow
>({
  config,
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ProfileChangeToolUIProps<TProposal, TReceipt, TCreate, TUpdate, TRow>) {
  const { addToolOutput, messages } = useHubChat();
  const queryClient = useQueryClient();
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const abandoned = React.useSyncExternalStore(
    subscribeHubHitlRemount,
    () => isHubHitlAbandonedOnRemount(toolCallId),
    () => false
  );
  const proposal = config.parseInput(args);
  const completed = config.parseOutput(result);
  const resolvedToolName = config.isToolName(toolName ?? "") ? (toolName as string) : config.toolId;
  const op = proposal?.op ?? "update";
  const id = proposal?.id;
  const isDelete = op === "delete";

  const currentQuery = useQuery({
    ...config.rowQueryOptions(id ?? ""),
    ...CURRENT_ROW_QUERY,
    enabled: Boolean(id) && op !== "create"
  });

  const createParsed =
    proposal && op === "create" ? config.createSchema.safeParse(proposal.patch) : null;
  const updateParsed =
    proposal && op === "update" ? config.updateSchema.safeParse(proposal.patch) : null;
  const rowGatePending =
    id != null &&
    op !== "create" &&
    (currentQuery.isLoading || currentQuery.isError || currentQuery.data == null);
  const confirmDisabled =
    proposal == null ||
    (isDelete
      ? !id
      : op === "create"
        ? !createParsed?.success
        : !updateParsed?.success || Object.keys(proposal.patch).length === 0) ||
    rowGatePending;

  const complete = React.useCallback(
    (output: TReceipt) => {
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
        complete(config.receipt("cancel", id));
        return;
      }
      if (isDelete) {
        if (!id) throw new Error(config.copy.errors.deleteIdRequired);
        await config.deleteRow(id);
        await queryClient.invalidateQueries({
          queryKey: config.listQueryKey()
        });
        complete(config.receipt("confirm", id));
        return;
      }
      if (op === "create") {
        if (!createParsed?.success) throw new Error(config.copy.errors.writeNotReady);
        const created = await config.createRow(createParsed.data);
        await queryClient.invalidateQueries({
          queryKey: config.listQueryKey()
        });
        complete(config.receipt("confirm", created.id));
        return;
      }
      if (!updateParsed?.success) throw new Error(config.copy.errors.writeNotReady);
      if (!id) throw new Error(config.copy.errors.updateIdRequired);
      const updated = await config.updateRow(id, updateParsed.data);
      if (updated == null) {
        // Row vanished between fetch and confirm — treat as a no-op cancel.
        complete(config.receipt("cancel", id));
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: config.listQueryKey()
      });
      await queryClient.invalidateQueries({
        queryKey: config.rowQueryKey(id)
      });
      complete(config.receipt("confirm", updated.id ?? id));
    },
    [complete, config, createParsed, id, isDelete, op, proposal, queryClient, updateParsed]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete(config.receipt("cancel", id));
  }, [abandoned, complete, completed, config, id, onLatest, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);
  const currentRow = op !== "create" && id ? currentQuery.data : null;

  if (receiptAction) {
    if (!proposal) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          {receiptAction === "confirm"
            ? isDelete
              ? config.copy.deletedReceipt
              : config.copy.savedReceipt
            : "No longer pending."}
        </p>
      );
    }
    return (
      <ProfileChangeCard
        fieldLabels={config.fieldLabels}
        rowPrimary={config.rowPrimary}
        rowSecondary={config.rowSecondary}
        renderPatchValue={config.renderPatchValue}
        copy={config.copy}
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
          {config.copy.waitingProposal}
        </p>
      );
    }
    return (
      <ProfileChangeCard
        fieldLabels={config.fieldLabels}
        rowPrimary={config.rowPrimary}
        rowSecondary={config.rowSecondary}
        renderPatchValue={config.renderPatchValue}
        copy={config.copy}
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
    <ProfileChangeCard
      fieldLabels={config.fieldLabels}
      rowPrimary={config.rowPrimary}
      rowSecondary={config.rowSecondary}
      renderPatchValue={config.renderPatchValue}
      copy={config.copy}
      toolCallId={toolCallId}
      op={op}
      patch={proposal.patch}
      currentRow={currentRow}
      confirmDisabled={confirmDisabled}
      loading={op !== "create" && currentQuery.isLoading}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

function ProfileChangeCard<TRow>({
  fieldLabels,
  rowPrimary,
  rowSecondary,
  renderPatchValue,
  copy,
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
  fieldLabels: Record<string, string>;
  rowPrimary: (row: TRow) => string;
  rowSecondary: (row: TRow) => string;
  renderPatchValue?: (key: string, value: unknown) => React.ReactNode;
  copy: ProfileChangeCopy;
  toolCallId: string;
  op: ProfileChangeOp;
  patch: Record<string, unknown>;
  currentRow: TRow | null | undefined;
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
      ? copy.titles.create
      : op === "delete"
        ? copy.titles.delete
        : copy.titles.update;
  const rowLabel = currentRow ? rowPrimary(currentRow) : null;
  const rowDetail = currentRow ? rowSecondary(currentRow) : null;

  const renderValue = (key: string, value: unknown): React.ReactNode => {
    if (renderPatchValue) return renderPatchValue(key, value);
    return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  };

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
      {op !== "create" && rowLabel != null ? (
        <p className="text-xs text-muted-foreground">
          {op === "delete" ? "Removing" : "Editing"}{" "}
          <span className="font-medium text-foreground">{rowLabel}</span> — {rowDetail}
        </p>
      ) : null}
      {op === "delete" ? (
        <p className="text-sm text-foreground">{copy.deleteWarning}</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => (
              <React.Fragment key={key}>
                <dt className="text-muted-foreground">{fieldLabels[key] ?? key}</dt>
                <dd className="min-w-0 wrap-break-word text-foreground">
                  {renderValue(key, value)}
                </dd>
              </React.Fragment>
            ))}
        </dl>
      )}
      {loading ? <p className="text-xs text-muted-foreground">Loading current entry…</p> : null}
    </ApprovalCard>
  );
}
