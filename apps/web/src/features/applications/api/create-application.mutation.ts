import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.create.mutationOptions({
      onSuccess: async () => {
        await invalidateApplicationsListQueries(queryClient);
        toast.success("Application added to pipeline.");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create application.");
      }
    })
  );
}
