import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useUpdateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          invalidateApplicationsListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.get(variables.id)
          })
        ]);
        // Description dialog owns a richer success toast (Track & package CTA).
        const keys = Object.keys(variables.data ?? {});
        const descriptionOnly = keys.length === 1 && keys[0] === "description";
        if (!descriptionOnly) {
          toast.success("Application updated.");
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update application.");
      }
    })
  );
}
