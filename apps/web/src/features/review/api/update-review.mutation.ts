import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { reviewQueryKeys } from "@/features/review/api/list-review.query";

export function useUpdateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.review.update.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData(reviewQueryKeys.get(data.id), data);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.review.list.key({ type: "query" })
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not save draft");
      }
    })
  );
}

export type UpdateReviewMutationResult = Awaited<ReturnType<typeof orpcClient.review.update>>;
