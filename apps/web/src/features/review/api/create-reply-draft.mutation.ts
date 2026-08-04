import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { reviewQueryKeys } from "@/features/review/api/list-review.query";

export function useCreateReplyDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.review.createReplyDraftFromMail.mutationOptions({
      onSuccess: async () => {
        toast.success("Reply draft ready in Review");
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.review.list.key({ type: "query" })
        });
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NOT_FOUND":
              toast.error(error.message || "Mail message not found.");
              return;
            case "NOT_CAREER":
              toast.error(error.message || "System notification mail cannot create reply drafts.");
              return;
            case "AGENT_FAILED":
              toastAiError(
                error.message || "AI reply draft failed — check Settings → AI and try again",
                {
                  feature: "review",
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

        toastAiError(error.message || "Could not create reply draft", {
          feature: "review",
          severity: "hard"
        });
      }
    })
  );
}

export type CreateReplyDraftMutationResult = Awaited<
  ReturnType<typeof orpcClient.review.createReplyDraftFromMail>
>;

export { reviewQueryKeys };
