import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_STAGE_LABELS,
  type ApplicationListOutput,
  type ApplicationStage
} from "@tsu-stack/core";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useUpdateStageMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.updateStage.mutationOptions({
      onMutate: async ({ id, stage }) => {
        await queryClient.cancelQueries({ queryKey: applicationsQueryKeys.list() });
        const previous = queryClient.getQueryData<ApplicationListOutput>(
          applicationsQueryKeys.list()
        );
        if (previous) {
          const now = new Date();
          queryClient.setQueryData<ApplicationListOutput>(
            applicationsQueryKeys.list(),
            previous.map((row) =>
              row.id === id
                ? { ...row, stage: stage as ApplicationStage, stageChangedAt: now, updatedAt: now }
                : row
            )
          );
        }
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(applicationsQueryKeys.list(), context.previous);
        }
        toast.error(error.message || "Failed to update stage.");
      },
      onSuccess: (data) => {
        toast.success(`Moved to ${APPLICATION_STAGE_LABELS[data.stage]}.`);
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
      }
    })
  );
}
