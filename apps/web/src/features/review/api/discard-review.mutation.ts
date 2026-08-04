import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useDiscardReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.review.discard.mutationOptions({
      onSuccess: async () => {
        toast.success("Discarded");
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.review.list.key({ type: "query" })
        });
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NOT_FOUND":
              toast.error(error.message || "Review item not found.");
              return;
            case "NOT_PENDING":
              toast.error(error.message || "Only pending items can be discarded.");
              return;
          }
        }

        toast.error(error.message || "Could not discard");
      }
    })
  );
}

export type DiscardReviewMutationResult = Awaited<ReturnType<typeof orpcClient.review.discard>>;
