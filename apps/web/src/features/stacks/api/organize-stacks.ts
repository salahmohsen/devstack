import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OrganizeAction, type OrganizeStacksOutput } from "@tsu-stack/core";

const STEP_LABELS: Record<string, string> = {
  "find-merges": "Finding duplicate stacks",
  "find-renames": "Checking naming conventions",
  "find-enrichments": "Analyzing metadata with AI",
  "sort-stacks": "Sorting by importance",
  "format-output": "Preparing results"
};

export function useOrganizeStacksMutation() {
  return useMutation({
    mutationFn: async (input: {
      onStepChange?: (step: string | null) => void;
      signal?: AbortSignal;
    }): Promise<OrganizeStacksOutput> => {
      const { onStepChange, signal } = input;
      const result: OrganizeStacksOutput = {
        actions: [],
        sortOrder: [],
        summary: { merges: 0, renames: 0, enrichments: 0, sorted: false }
      };

      onStepChange?.("Initializing");

      const iterator = await orpcClient.agent.organizeStacks({}, { signal });

      for await (const raw of iterator) {
        if (signal?.aborted) break;

        const event =
          ((raw as Record<string, unknown>).json as Record<string, unknown>) ??
          (raw as Record<string, unknown>);
        const eventType = event.type as string | undefined;
        const payload = event.payload as Record<string, unknown> | undefined;

        if (eventType === "workflow-step-start") {
          const stepName = (payload?.stepName as string) ?? null;
          onStepChange?.(stepName ? (STEP_LABELS[stepName] ?? stepName) : null);
        }

        if (eventType === "workflow-step-result" && payload?.status === "success") {
          const output = payload.output as Record<string, unknown> | undefined;

          if (output && "actions" in output) {
            result.actions = (output.actions ?? []) as OrganizeAction[];
            result.sortOrder = (output.sortOrder ?? []) as string[];
            result.summary = (output.summary ?? result.summary) as OrganizeStacksOutput["summary"];
            onStepChange?.(null);
          }
        }

        if (eventType === "workflow-step-error") {
          onStepChange?.(null);
        }
      }

      return result;
    }
  });
}
