import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useConfirmReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.review.confirm.mutationOptions({
      onSuccess: async (data) => {
        toast.success(data.note ?? (data.sent ? "Reply sent" : "Confirmed"));
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
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NOT_FOUND":
              toast.error(error.message || "Review item not found.");
              return;
            case "NOT_PENDING":
              toast.error(error.message || "Only pending items can be confirmed.");
              return;
            case "SEND_FAILED":
              toast.error(error.message || "Could not send the reply.");
              return;
          }
        }

        toast.error(error.message || "Could not send reply");
      }
    })
  );
}

export type ConfirmReviewMutationResult = Awaited<ReturnType<typeof orpcClient.review.confirm>>;
