"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  evidenceGoalsReady,
  projectPatchGroundedInAnalysis,
  type EvidenceKind,
  type ProposeEvidenceChangeInput,
  type ProposeEvidenceChangeOutput
} from "@tsu-stack/core";

import { invalidateExperiencesListQueries } from "@/shared/lib/invalidate-experiences-list";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  buildEvidenceWrite,
  mergeEvidenceRecord,
  rowToRecord,
  type EvidenceWrite
} from "@/features/agent-hub/lib/evidence-change-payload";
import {
  isExtraWaitingEvidenceCard,
  isLaterEvidenceAfterSameEntityConfirm,
  isProposeEvidenceChangeToolName,
  parseProposeEvidenceChangeInput,
  parseProposeEvidenceChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

import { EvidenceApprovalCard } from "./evidence-approval-card";

const EVIDENCE_CHANGE_TOOL_ID = "propose-evidence-change";

const CURRENT_ROW_QUERY = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false
};

export function EvidenceChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeEvidenceChangeInput, ProposeEvidenceChangeOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const queryClient = useQueryClient();
  const proposal = parseProposeEvidenceChangeInput(args);
  const completed = parseProposeEvidenceChangeOutput(result);
  const kind = proposal?.kind;
  const id = proposal?.id;
  const hideAsSuperseded =
    isLaterEvidenceAfterSameEntityConfirm(messages, toolCallId) ||
    isExtraWaitingEvidenceCard(messages, toolCallId);
  const resolvedToolName = isProposeEvidenceChangeToolName(toolName ?? "")
    ? (toolName as string)
    : EVIDENCE_CHANGE_TOOL_ID;

  const projectQuery = useQuery({
    ...orpcQueryClient.projects.get.queryOptions({ input: { id: id ?? "" } }),
    ...CURRENT_ROW_QUERY,
    enabled: Boolean(id) && kind === "project"
  });
  const experienceQuery = useQuery({
    ...orpcQueryClient.experiences.get.queryOptions({ input: { id: id ?? "" } }),
    ...CURRENT_ROW_QUERY,
    enabled: Boolean(id) && kind === "experience"
  });
  const stackQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({ input: { id: id ?? "" } }),
    ...CURRENT_ROW_QUERY,
    enabled: Boolean(id) && kind === "stack"
  });

  const currentQuery =
    kind === "project" ? projectQuery : kind === "experience" ? experienceQuery : stackQuery;
  const currentRow = id ? rowToRecord(currentQuery.data) : null;
  const currentLoading = Boolean(id) && currentQuery.isLoading;
  const currentMissing = Boolean(id) && (currentQuery.isError || currentQuery.data == null);
  const record =
    proposal == null
      ? null
      : id
        ? currentRow
          ? mergeEvidenceRecord(currentRow, proposal.patch)
          : null
        : mergeEvidenceRecord(null, proposal.patch);
  const markdownEmpty = !proposal || proposal.proposedMarkdown.trim().length === 0;
  const ready = Boolean(kind && record && evidenceGoalsReady(kind, record));
  const analysisGrounding =
    kind === "project" && proposal
      ? projectPatchGroundedInAnalysis({
          mode: id ? "update" : "create",
          analysis:
            typeof currentRow?.analysis === "string"
              ? currentRow.analysis
              : typeof record?.analysis === "string"
                ? record.analysis
                : null,
          patch: proposal.patch
        })
      : { ok: true as const };
  const confirmDisabled =
    proposal == null ||
    !ready ||
    markdownEmpty ||
    currentLoading ||
    (Boolean(id) && currentMissing) ||
    !analysisGrounding.ok;

  const complete = React.useCallback(
    (output: ProposeEvidenceChangeOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  const cancelSiblingCards = React.useCallback(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const raw of msg.parts ?? []) {
        const part = raw as {
          type?: string;
          toolName?: string;
          toolCallId?: string;
          state?: string;
          input?: unknown;
        };
        const type = part.type ?? "";
        const isTool = type.startsWith("tool-") || type === "dynamic-tool";
        if (!isTool) continue;
        const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
        if (!isProposeEvidenceChangeToolName(name)) continue;
        const siblingId = part.toolCallId ?? "";
        if (!siblingId || siblingId === toolCallId) continue;
        if (
          part.state !== "input-available" &&
          part.state !== "input-streaming" &&
          part.state !== "call" &&
          part.state !== "partial-call"
        ) {
          continue;
        }
        const sibling = parseProposeEvidenceChangeInput(part.input);
        void addToolOutput({
          tool: name,
          toolCallId: siblingId,
          output: {
            action: "cancel",
            kind: sibling?.kind ?? kind ?? "project",
            ...(sibling?.id ? { id: sibling.id } : {})
          }
        });
      }
    }
  }, [addToolOutput, kind, messages, toolCallId]);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !proposal || !kind) {
        complete({
          action: "cancel",
          kind: kind ?? "project",
          ...(id ? { id } : {})
        });
        return;
      }
      if (!record) {
        throw new Error("Current row not loaded");
      }
      const write = buildEvidenceWrite({
        kind,
        id,
        record,
        patch: proposal.patch,
        currentRow
      });
      if (!write) {
        throw new Error("Evidence change is not ready to write");
      }
      const writtenId = await persistEvidenceWrite(write);
      await invalidateEvidenceQueries(queryClient, kind, writtenId);
      cancelSiblingCards();
      complete({ action: "confirm", kind, id: writtenId });
    },
    [cancelSiblingCards, complete, currentRow, id, kind, proposal, queryClient, record]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (!hideAsSuperseded) return;
    complete({
      action: "cancel",
      kind: kind ?? "project",
      ...(id ? { id } : {})
    });
  }, [complete, completed, hideAsSuperseded, id, kind, toolCallId]);

  if (completed) {
    if (hideAsSuperseded) return null;
    if (completed.action === "cancel") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          You cancelled — no {completed.kind} changes.
        </p>
      );
    }
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        {proposal?.id ? "Updated" : "Created"} {completed.kind}.
      </p>
    );
  }

  if (hideAsSuperseded) return null;

  if (!proposal) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting for an evidence proposal…
        </p>
      );
    }
    return (
      <EvidenceApprovalCard
        toolCallId={toolCallId}
        kind={null}
        currentMarkdown=""
        proposedMarkdown=""
        confirmDisabled
        disabled={result != null || !toolCallId}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <EvidenceApprovalCard
      toolCallId={toolCallId}
      kind={proposal.kind}
      id={proposal.id}
      currentMarkdown={proposal.currentMarkdown}
      proposedMarkdown={proposal.proposedMarkdown}
      confirmDisabled={confirmDisabled}
      loading={currentLoading}
      hint={
        !analysisGrounding.ok
          ? analysisGrounding.reason === "missing_analysis"
            ? "This rewrite needs the project analysis notes (or facts you just added)."
            : "This rewrite is not backed by the project analysis notes."
          : undefined
      }
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

async function persistEvidenceWrite(write: EvidenceWrite): Promise<string> {
  if (write.kind === "project") {
    if (write.mode === "create") {
      const created = await orpcClient.projects.create(write.input);
      return created.id;
    }
    const updated = await orpcClient.projects.update({ id: write.id, data: write.data });
    return updated?.id ?? write.id;
  }
  if (write.kind === "experience") {
    if (write.mode === "create") {
      const created = await orpcClient.experiences.create(write.input);
      return created.id;
    }
    const updated = await orpcClient.experiences.update({ id: write.id, data: write.data });
    return updated?.id ?? write.id;
  }
  if (write.mode === "create") {
    const created = await orpcClient.stacks.create(write.input);
    return created.id;
  }
  const updated = await orpcClient.stacks.update({ id: write.id, data: write.data });
  return updated?.id ?? write.id;
}

async function invalidateEvidenceQueries(
  queryClient: Parameters<typeof invalidateProjectsListQueries>[0],
  kind: EvidenceKind,
  id: string
): Promise<void> {
  if (kind === "project") {
    await invalidateProjectsListQueries(queryClient);
    await queryClient.invalidateQueries({
      queryKey: orpcQueryClient.projects.get.queryKey({ input: { id } })
    });
    return;
  }
  if (kind === "experience") {
    await invalidateExperiencesListQueries(queryClient);
    await queryClient.invalidateQueries({
      queryKey: orpcQueryClient.experiences.get.queryKey({ input: { id } })
    });
    return;
  }
  await invalidateStacksListQueries(queryClient);
  await queryClient.invalidateQueries({
    queryKey: orpcQueryClient.stacks.get.queryKey({ input: { id } })
  });
}
