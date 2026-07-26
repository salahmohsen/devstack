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

function unwrapEvent(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  if (record.json && typeof record.json === "object") {
    return record.json as Record<string, unknown>;
  }
  return record;
}

function getErrorMessage(error: unknown): string {
  if (!error) return "Stack detection failed.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) return record.message;
    const data = record.data;
    if (
      data &&
      typeof data === "object" &&
      typeof (data as { message?: string }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
    const cause = record.cause;
    if (cause instanceof Error && cause.message) return cause.message;
  }
  return "Stack detection failed.";
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

      onStepChange?.("Initializing");

      try {
        const iterator = await orpcClient.agent.detectStacks(rpcInput, { signal });

        for await (const raw of iterator) {
          if (signal?.aborted) {
            throw new DOMException("Stack detection cancelled.", "AbortError");
          }

          const event = unwrapEvent(raw);
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
            const message =
              (payload?.error as { message?: string } | undefined)?.message ??
              (typeof payload?.error === "string" ? payload.error : null) ??
              "A detection step failed.";
            throw new Error(message);
          }

          if (eventType === "workflow-failed" || eventType === "error") {
            const message =
              (payload?.error as { message?: string } | undefined)?.message ??
              (typeof event.error === "string" ? event.error : null) ??
              "Stack detection failed.";
            throw new Error(message);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (signal?.aborted) {
          throw new DOMException("Stack detection cancelled.", "AbortError");
        }
        throw new Error(getErrorMessage(error));
      }

      if (signal?.aborted) {
        throw new DOMException("Stack detection cancelled.", "AbortError");
      }

      result.currentStep = null;
      onStepChange?.(null);
      return result;
    }
  });
}
