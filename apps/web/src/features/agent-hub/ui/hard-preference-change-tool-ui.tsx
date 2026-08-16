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
import {
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
  const { addToolOutput } = useHubChat();
  const queryClient = useQueryClient();
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
      complete({ action: "confirm", patch });
    },
    [complete, patch, prefs.data, upsertPreferences]
  );

  if (completed) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        {completed.action === "confirm"
          ? "Updated hard-stop preferences."
          : "You cancelled — no preference changes."}
      </p>
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
