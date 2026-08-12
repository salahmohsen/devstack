import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useAddApplicationNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.addNote.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.activity(variables.applicationId)
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add note.");
      }
    })
  );
}
