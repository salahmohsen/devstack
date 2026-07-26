import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ResumeImportDraft, type ResumeImportExtractClientInput } from "@tsu-stack/core";

/** Maps Mastra step ids (+ local synthetic phases) to UI copy. */
const STEP_LABELS: Record<string, string> = {
  download: "Downloading resume",
  "pdf-text": "Preparing resume text",
  prepare: "Preparing resume text",
  extract: "Extracting experience and skills",
  normalize: "Normalizing fields",
  format: "Building review draft"
};

function unwrapEvent(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  if (record.json && typeof record.json === "object") {
    return record.json as Record<string, unknown>;
  }
  return record;
}

function isResumeImportDraft(output: Record<string, unknown>): output is ResumeImportDraft {
  return (
    "profile" in output && "experiences" in output && "projects" in output && "stacks" in output
  );
}

function getErrorMessage(error: unknown): string {
  if (!error) return "Resume analysis failed.";
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
  }
  return "Resume analysis failed.";
}

export function useExtractResumeMutation() {
  return useMutation({
    mutationFn: async (input: {
      objectKey: string;
      filename?: string;
      onStepChange?: (step: string | null) => void;
      onPartialResults?: (draft: ResumeImportDraft) => void;
      signal?: AbortSignal;
    }): Promise<ResumeImportDraft> => {
      const { onStepChange, onPartialResults, signal, ...rpcInput } = input;
      let draft: ResumeImportDraft | null = null;

      onStepChange?.("Starting analysis…");

      try {
        const iterator = await orpcClient.onboarding.extract(
          rpcInput satisfies ResumeImportExtractClientInput,
          { signal }
        );

        for await (const raw of iterator) {
          if (signal?.aborted) {
            throw new DOMException("Resume analysis cancelled.", "AbortError");
          }

          const event = unwrapEvent(raw);
          const eventType = event.type as string | undefined;
          const payload = event.payload as Record<string, unknown> | undefined;

          if (eventType === "workflow-step-start") {
            const stepName = (payload?.stepName as string) ?? null;
            onStepChange?.(stepName ? (STEP_LABELS[stepName] ?? stepName) : null);
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
            const message =
              (payload?.error as { message?: string } | undefined)?.message ??
              (typeof payload?.error === "string" ? payload.error : null) ??
              "A resume analysis step failed.";
            throw new Error(message);
          }

          if (eventType === "workflow-failed" || eventType === "error") {
            const message =
              (payload?.error as { message?: string } | undefined)?.message ??
              (typeof event.error === "string" ? event.error : null) ??
              "Resume analysis failed.";
            throw new Error(message);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (signal?.aborted) {
          throw new DOMException("Resume analysis cancelled.", "AbortError");
        }
        throw new Error(getErrorMessage(error));
      }

      if (signal?.aborted) {
        throw new DOMException("Resume analysis cancelled.", "AbortError");
      }

      onStepChange?.(null);

      if (!draft) {
        throw new Error("Resume extract finished without a draft");
      }

      return draft;
    }
  });
}
