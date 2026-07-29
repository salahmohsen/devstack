import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

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
        toast.error(error.message || "Could not create reply draft");
      }
    })
  );
}

export type CreateReplyDraftMutationResult = Awaited<
  ReturnType<typeof orpcClient.review.createReplyDraftFromMail>
>;

export { reviewQueryKeys };
