import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from "@tsu-stack/core";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import {
  cancelApplicationListQueries,
  patchApplicationFields,
  restoreApplicationListCaches,
  snapshotApplicationListCaches
} from "@/features/applications/lib/application-list-cache";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useUpdateStageMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.updateStage.mutationOptions({
      onMutate: async ({ id, stage }) => {
        await cancelApplicationListQueries(queryClient);
        const previous = snapshotApplicationListCaches(queryClient);
        const now = new Date();
        patchApplicationFields(queryClient, id, {
          stage: stage as ApplicationStage,
          stageChangedAt: now,
          updatedAt: now
        });
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) {
          restoreApplicationListCaches(queryClient, context.previous);
        }
        toast.error(error.message || "Failed to update stage.");
      },
      onSuccess: (data) => {
        toast.success(`Moved to ${APPLICATION_STAGE_LABELS[data.stage]}.`);
      },
      onSettled: async (_data, _err, variables) => {
        await Promise.all([
          invalidateApplicationsListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.activity(variables.id)
          })
        ]);
      }
    })
  );
}
