import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useConfirmReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.review.confirm.mutationOptions({
      onSuccess: async (data) => {
        toast.success(data.sent ? "Marked sent (outbound stub)" : "Confirmed");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.review.list.key({ type: "query" })
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.review.get.key({ type: "query" })
          })
        ]);
      },
      onError: (error) => {
        toast.error(error.message || "Could not confirm");
      }
    })
  );
}

export type ConfirmReviewMutationResult = Awaited<ReturnType<typeof orpcClient.review.confirm>>;
