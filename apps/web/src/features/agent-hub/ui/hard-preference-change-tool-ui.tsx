"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  applyHardJobPreferencePatch,
  type ProposeHardPreferenceChangeInput,
  type ProposeHardPreferenceChangeOutput
} from "@tsu-stack/core";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import {
  isHubHitlAbandonedOnRemount,
  subscribeHubHitlRemount
} from "@/features/agent-hub/lib/hub-hitl-remount";
import {
  isLaterHardStopAfterConfirm,
  isProposeHardPreferenceChangeToolName,
  parseProposeHardPreferenceChangeInput,
  parseProposeHardPreferenceChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

import { HardPreferenceConfirmCard } from "./hard-preference-confirm-card";

const HARD_PREFERENCE_TOOL_ID = "propose-hard-preference-change";

export function HardPreferenceChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<ProposeHardPreferenceChangeInput, ProposeHardPreferenceChangeOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const queryClient = useQueryClient();
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const abandoned = React.useSyncExternalStore(
    subscribeHubHitlRemount,
    () => isHubHitlAbandonedOnRemount(toolCallId),
    () => false
  );
  const duplicateAfterConfirm = isLaterHardStopAfterConfirm(messages, toolCallId);
  const prefs = useQuery(
    orpcQueryClient.jobPreference.get.queryOptions({
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    })
  );
  const { mutateAsync: upsertPreferences } = useMutation(
    orpcQueryClient.jobPreference.upsert.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData(orpcQueryClient.jobPreference.get.key(), data);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.jobPreference.get.key()
        });
      }
    })
  );
  const patch = parseProposeHardPreferenceChangeInput(args);
  const completed = parseProposeHardPreferenceChangeOutput(result);
  const resolvedToolName = isProposeHardPreferenceChangeToolName(toolName ?? "")
    ? (toolName as string)
    : HARD_PREFERENCE_TOOL_ID;

  const complete = React.useCallback(
    (output: ProposeHardPreferenceChangeOutput) => {
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
        };
        const type = part.type ?? "";
        const isTool = type.startsWith("tool-") || type === "dynamic-tool";
        if (!isTool) continue;
        const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
        if (!isProposeHardPreferenceChangeToolName(name)) continue;
        const id = part.toolCallId ?? "";
        if (!id || id === toolCallId) continue;
        if (
          part.state !== "input-available" &&
          part.state !== "input-streaming" &&
          part.state !== "call" &&
          part.state !== "partial-call"
        ) {
          continue;
        }
        void addToolOutput({
          tool: name,
          toolCallId: id,
          output: { action: "cancel", patch: undefined }
        });
      }
    }
  }, [addToolOutput, messages, toolCallId]);

  const handleSubmit = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (action === "cancel" || !patch) {
        complete({ action: "cancel", patch: patch ?? undefined });
        return;
      }
      const current = prefs.data;
      if (!current) {
        throw new Error("Preferences not loaded");
      }
      const upsertInput = applyHardJobPreferencePatch(
        {
          excludeKeywords: current.excludeKeywords,
          salaryMin: current.salaryMin ?? null,
          salaryCurrency: current.salaryCurrency ?? null,
          levelFloor: current.levelFloor ?? null
        },
        patch
      );
      await upsertPreferences({
        ...upsertInput,
        briefInvalidateSource: "hub"
      });
      cancelSiblingCards();
      complete({ action: "confirm", patch });
    },
    [cancelSiblingCards, complete, patch, prefs.data, upsertPreferences]
  );

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (!duplicateAfterConfirm) return;
    complete({ action: "cancel", patch: patch ?? undefined });
  }, [complete, completed, duplicateAfterConfirm, patch, toolCallId]);

  React.useEffect(() => {
    if (completed || !toolCallId) return;
    if (onLatest && !abandoned) return;
    complete({ action: "cancel", patch: patch ?? undefined });
  }, [abandoned, complete, completed, onLatest, patch, toolCallId]);

  const receiptAction = completed?.action ?? (abandoned || !onLatest ? "cancel" : null);

  if (duplicateAfterConfirm) return null;

  if (receiptAction) {
    if (!patch) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          {receiptAction === "confirm" ? "Updated hard-stop preferences." : "No longer pending."}
        </p>
      );
    }
    return (
      <HardPreferenceConfirmCard
        toolCallId={toolCallId}
        patch={patch}
        completedAction={receiptAction}
        disabled
        onSubmit={() => undefined}
      />
    );
  }

  if (!patch) {
    if (status?.type === "running") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Waiting for a hard-stop proposal…
        </p>
      );
    }
    return (
      <HardPreferenceConfirmCard
        toolCallId={toolCallId}
        patch={null}
        disabled={result != null || !toolCallId}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <HardPreferenceConfirmCard
      toolCallId={toolCallId}
      patch={patch}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}
