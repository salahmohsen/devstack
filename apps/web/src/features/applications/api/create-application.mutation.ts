import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
        toast.success("Application added to pipeline.");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create application.");
      }
    })
  );
}
