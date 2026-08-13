import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { toastAiError } from "@/shared/lib/toast-ai-error";

export function useGenerateMailReplyMutation() {
  return useMutation(
    orpcQueryClient.mail.generateReply.mutationOptions({
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NOT_FOUND":
              toastAiError(error.message || "Mail message not found.", {
                feature: "mail",
                severity: "hard"
              });
              return;
            case "NOT_CAREER":
              toastAiError(error.message || "System notification mail cannot generate replies.", {
                feature: "mail",
                severity: "hard"
              });
              return;
            case "AI_NOT_CONFIGURED":
              toastAiError(error.message || "Configure a BYO API key under Settings → AI", {
                feature: "mail",
                severity: "hard",
                action: {
                  label: "AI settings",
                  to: "/dashboard/settings/ai"
                }
              });
              return;
            case "AGENT_FAILED":
              toastAiError(
                error.message || "AI reply draft failed — check Settings → AI and try again",
                {
                  feature: "mail",
                  severity: "hard",
                  action: {
                    label: "AI settings",
                    to: "/dashboard/settings/ai"
                  }
                }
              );
              return;
          }
        }

        toastAiError(error.message || "Could not generate reply", {
          feature: "mail",
          severity: "hard"
        });
      }
    })
  );
}

export type GenerateMailReplyMutationResult = Awaited<
  ReturnType<typeof orpcClient.mail.generateReply>
>;
