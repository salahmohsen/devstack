import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { APPLICATION_OUTCOME_LABELS } from "@tsu-stack/core";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useSetOutcomeMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.setOutcome.mutationOptions({
      onSuccess: async (data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() }),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.get(variables.id)
          }),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.activity(variables.id)
          })
        ]);
        toast.success(`Closed · ${APPLICATION_OUTCOME_LABELS[data.outcome!]}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to close application.");
      }
    })
  );
}
