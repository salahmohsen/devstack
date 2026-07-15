import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type DetectedStack, type DetectStacksResult } from "@tsu-stack/core";

const STEP_LABELS: Record<string, string> = {
  "fetch-repo-package-jsons": "Fetching repository files",
  "extract-dependencies": "Extracting dependencies",
  "programmatic-match": "Matching known stacks",
  "ai-categorize": "Categorizing unknown packages",
  "deduplicate-groups": "Deduplicating stacks",
  "resolve-icons": "Resolving icons",
  format: "Processing results"
};

export function useDetectStacksMutation() {
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      repos: string[];
      onStepChange?: (step: string | null) => void;
      onPartialResults?: (results: DetectStacksResult) => void;
    }): Promise<DetectStacksResult> => {
      const { onStepChange, onPartialResults, ...rpcInput } = input;
      const result: DetectStacksResult = {
        detectedStacks: [],
        groupedByRepo: [],
        hasChanges: false,
        diff: null,
        currentStep: null
      };

      onStepChange?.("Initializing");

      const iterator = await orpcClient.agent.detectStacks(rpcInput);

      for await (const raw of iterator) {
        const event =
          ((raw as Record<string, unknown>).json as Record<string, unknown>) ??
          (raw as Record<string, unknown>);
        const eventType = event.type as string | undefined;
        const payload = event.payload as Record<string, unknown> | undefined;

        if (eventType === "workflow-step-start") {
          const stepName = (payload?.stepName as string) ?? null;
          result.currentStep = stepName;
          onStepChange?.(stepName ? (STEP_LABELS[stepName] ?? stepName) : null);
        }

        if (eventType === "workflow-step-result" && payload?.status === "success") {
          const output = payload.output as Record<string, unknown> | undefined;

          if (output && "detectedStacks" in output) {
            result.detectedStacks = (output.detectedStacks ?? []) as DetectedStack[];
            result.groupedByRepo = (output.groupedByRepo ??
              []) as DetectStacksResult["groupedByRepo"];
            result.hasChanges = (output.hasChanges ?? false) as boolean;
            result.diff = (output.diff ?? null) as DetectStacksResult["diff"];

            onPartialResults?.({ ...result });
          }
        }

        if (eventType === "workflow-step-error") {
          result.currentStep = null;
          onStepChange?.(null);
        }
      }

      result.currentStep = null;
      onStepChange?.(null);
      return result;
    }
  });
}
