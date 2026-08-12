import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useBatchRestoreApplicationsMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.batchRestore.mutationOptions({
      onSuccess: async (rows) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("inbox") }),
          queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("dismissed") }),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("inbox")
          }),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("dismissed")
          })
        ]);
        const n = rows.length;
        toast.success(n === 1 ? "Restored to New" : `Restored ${n} jobs to New`);
      },
      onError: (error) => {
        toast.error(error.message || "Could not restore");
      }
    })
  );
}
