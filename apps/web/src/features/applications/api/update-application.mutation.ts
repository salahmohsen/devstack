import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useUpdateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.get(variables.id)
        });
        toast.success("Application updated.");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update application.");
      }
    })
  );
}
