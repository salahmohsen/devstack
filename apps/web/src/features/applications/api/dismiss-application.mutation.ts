import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useDismissApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.dismiss.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("inbox") }),
          queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("dismissed") }),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.activity(variables.id)
          }),
          queryClient.invalidateQueries({
            queryKey: applicationCountQueryKeys.byStatus("inbox")
          })
        ]);
      }
    })
  );
}
