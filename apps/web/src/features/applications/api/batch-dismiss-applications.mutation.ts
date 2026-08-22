import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useBatchDismissApplicationsMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.batchDismiss.mutationOptions({
      onSuccess: async (rows) => {
        await Promise.all([
          invalidateApplicationsListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("inbox")
          }),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("dismissed")
          })
        ]);
        const n = rows.length;
        toast.success(n === 1 ? "Dismissed" : `Dismissed ${n} jobs`);
      },
      onError: (error) => {
        toast.error(error.message || "Could not dismiss");
      }
    })
  );
}
