import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type DetectedStack, type DetectStacksResult } from "@tsu-stack/core";

import {
  cancelMastraWorkflowRun,
  extractRunId,
  getWorkflowErrorMessage,
  isAbortError,
  unwrapWorkflowEvent,
  workflowFailedMessage,
  workflowStepErrorMessage
} from "@/shared/lib/ai-job";

const DETECT_WORKFLOW_ID = "detect-stacks-workflow";

const STEP_LABELS: Record<string, string> = {
  "fetch-repo-package-jsons": "Fetching repository files",
  "extract-dependencies": "Extracting dependencies",
  "programmatic-match": "Matching known stacks",
  "ai-categorize": "Categorizing unknown packages",
  "deduplicate-groups": "Deduplicating stacks",
  "resolve-icons": "Resolving icons",
  format: "Processing results"
};

/**
 * Abort stream + explicit Mastra cancel RPC.
 * Stream abort alone is not always enough to stop in-flight LLM steps.
 */
function cancelDetectRun(runId: string | null) {
  cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId);
}

export function useDetectStacksMutation() {
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      repos: string[];
      onStepChange?: (step: string | null) => void;
      onPartialResults?: (results: DetectStacksResult) => void;
      signal?: AbortSignal;
    }): Promise<DetectStacksResult> => {
      const { onStepChange, onPartialResults, signal, ...rpcInput } = input;
      const result: DetectStacksResult = {
        detectedStacks: [],
        groupedByRepo: [],
        hasChanges: false,
        diff: null,
        currentStep: null
      };

      let runId: string | null = null;

      const onAbort = () => {
        cancelDetectRun(runId);
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      onStepChange?.("Initializing");

      try {
        if (signal?.aborted) {
          throw new DOMException("Stack detection cancelled.", "AbortError");
        }

        const iterator = await orpcClient.agent.detectStacks(rpcInput, { signal });

        for await (const raw of iterator) {
          if (signal?.aborted) {
            cancelDetectRun(runId);
            throw new DOMException("Stack detection cancelled.", "AbortError");
          }

          const event = unwrapWorkflowEvent(raw);
          const eventType = event.type as string | undefined;
          const payload = event.payload as Record<string, unknown> | undefined;

          // Capture runId from any event so cancel RPC works ASAP
          const maybeRunId = extractRunId(event, payload);
          if (maybeRunId) runId = maybeRunId;

          if (eventType === "workflow-run-created") {
            continue;
          }

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
            throw new Error(workflowStepErrorMessage(payload, "A detection step failed."));
          }

          if (eventType === "workflow-failed" || eventType === "error") {
            throw new Error(workflowFailedMessage(event, payload, "Stack detection failed."));
          }
        }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          cancelDetectRun(runId);
          throw new DOMException("Stack detection cancelled.", "AbortError");
        }
        throw new Error(getWorkflowErrorMessage(error, "Stack detection failed."));
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }

      if (signal?.aborted) {
        cancelDetectRun(runId);
        throw new DOMException("Stack detection cancelled.", "AbortError");
      }

      result.currentStep = null;
      onStepChange?.(null);
      return result;
    }
  });
}
