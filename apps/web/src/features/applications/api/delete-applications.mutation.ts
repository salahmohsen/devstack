import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useDeleteApplicationsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.delete.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          invalidateApplicationsListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("inbox")
          }),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("dismissed")
          }),
          ...variables.ids.map((id) =>
            queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.activity(id) })
          )
        ]);
        const n = variables.ids.length;
        toast.success(n === 1 ? "Job permanently deleted." : `${n} jobs permanently deleted.`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete.");
      }
    })
  );
}
