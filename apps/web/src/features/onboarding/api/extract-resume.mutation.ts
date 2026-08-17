import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ResumeImportDraft, type ResumeImportExtractClientInput } from "@tsu-stack/core";

import {
  cancelMastraWorkflowRun,
  extractRunId,
  getWorkflowErrorMessage,
  isAbortError,
  unwrapWorkflowEvent,
  workflowFailedMessage,
  workflowStepErrorMessage
} from "@/shared/lib/ai-job";

export const RESUME_IMPORT_WORKFLOW_ID = "resume-import-workflow";

/** Maps Mastra step ids (+ local synthetic phases) to UI copy. */
export const RESUME_EXTRACT_STEP_LABELS: Record<string, string> = {
  download: "Downloading resume",
  "pdf-text": "Preparing resume text",
  prepare: "Preparing resume text",
  extract: "Extracting experience",
  normalize: "Normalizing fields",
  format: "Building review draft"
};

function isResumeImportDraft(output: Record<string, unknown>): output is ResumeImportDraft {
  return (
    "profile" in output && "experiences" in output && "projects" in output && "stacks" in output
  );
}

export type RunExtractResumeInput = {
  objectKey: string;
  filename?: string;
  onStepChange?: (step: string | null) => void;
  onRunId?: (runId: string) => void;
  onPartialResults?: (draft: ResumeImportDraft) => void;
  signal?: AbortSignal;
};

/**
 * Stream `onboarding.extract` until a review draft is ready.
 * Used by the React Query mutation and the detached background job.
 */
export async function runExtractResume(input: RunExtractResumeInput): Promise<ResumeImportDraft> {
  const { onStepChange, onRunId, onPartialResults, signal, ...rpcInput } = input;
  let draft: ResumeImportDraft | null = null;
  let runId: string | null = null;

  const onAbort = () => {
    cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  onStepChange?.("Starting analysis");

  try {
    const iterator = await orpcClient.onboarding.extract(
      rpcInput satisfies ResumeImportExtractClientInput,
      { signal }
    );

    for await (const raw of iterator) {
      if (signal?.aborted) {
        cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId);
        throw new DOMException("Resume analysis cancelled.", "AbortError");
      }

      const event = unwrapWorkflowEvent(raw);
      const eventType = event.type as string | undefined;
      const payload = event.payload as Record<string, unknown> | undefined;

      const maybeRunId = extractRunId(event, payload);
      if (maybeRunId) {
        runId = maybeRunId;
        onRunId?.(maybeRunId);
      }

      if (eventType === "workflow-run-created") {
        continue;
      }

      if (eventType === "workflow-step-start") {
        const stepName = (payload?.stepName as string) ?? null;
        onStepChange?.(stepName ? (RESUME_EXTRACT_STEP_LABELS[stepName] ?? stepName) : null);
      }

      // Only the format step is the final draft. normalize also has
      // profile/experiences/projects/stacks and must not clear the UI step.
      if (eventType === "workflow-step-result" && payload?.status === "success") {
        const stepName = (payload.stepName as string) ?? (payload.id as string) ?? "";
        const output = payload.output as Record<string, unknown> | undefined;

        if (stepName === "format" && output && isResumeImportDraft(output)) {
          draft = output;
          onPartialResults?.(draft);
        }
      }

      if (eventType === "workflow-step-error") {
        throw new Error(workflowStepErrorMessage(payload, "A resume analysis step failed."));
      }

      if (eventType === "workflow-failed" || eventType === "error") {
        throw new Error(workflowFailedMessage(event, payload, "Resume analysis failed."));
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId);
      throw error;
    }
    if (signal?.aborted) {
      cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId);
      throw new DOMException("Resume analysis cancelled.", "AbortError");
    }
    throw new Error(getWorkflowErrorMessage(error, "Resume analysis failed."));
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  if (signal?.aborted) {
    cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId);
    throw new DOMException("Resume analysis cancelled.", "AbortError");
  }

  onStepChange?.(null);

  if (!draft) {
    throw new Error("Resume extract finished without a draft");
  }

  return draft;
}

export function useExtractResumeMutation() {
  return useMutation({
    mutationFn: (input: RunExtractResumeInput) => runExtractResume(input)
  });
}
