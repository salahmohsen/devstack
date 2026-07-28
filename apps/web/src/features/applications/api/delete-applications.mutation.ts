import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useDeleteApplicationsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.delete.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
        const n = variables.ids.length;
        toast.success(n === 1 ? "Application deleted." : `${n} applications deleted.`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete.");
      }
    })
  );
}
