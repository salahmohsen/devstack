import { useMutation } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ResumeImportDraft, type ResumeImportExtractClientInput } from "@tsu-stack/core";

const STEP_LABELS: Record<string, string> = {
  prepare: "Preparing resume text",
  extract: "Extracting experience and skills",
  normalize: "Normalizing fields",
  format: "Building draft"
};

function isResumeImportDraft(output: Record<string, unknown>): output is ResumeImportDraft {
  return (
    "profile" in output && "experiences" in output && "projects" in output && "stacks" in output
  );
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

      onStepChange?.("Initializing");

      const iterator = await orpcClient.onboarding.extract(
        rpcInput satisfies ResumeImportExtractClientInput,
        { signal }
      );

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

          if (output && isResumeImportDraft(output)) {
            draft = output;
            onPartialResults?.(draft);
            onStepChange?.(null);
          }
        }

        if (eventType === "workflow-step-error") {
          onStepChange?.(null);
        }
      }

      onStepChange?.(null);

      if (!draft) {
        throw new Error("Resume extract finished without a draft");
      }

      return draft;
    }
  });
}
