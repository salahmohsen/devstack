import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput } from "@tsu-stack/core";

import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";
import { toastAiError } from "@/shared/lib/toast-ai-error";

function trackedListKey() {
  return orpcQueryClient.applications.list.queryKey({ input: { trackingStatus: "tracked" } });
}

export function useCreateApplicationFromJdMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.create.mutationOptions({
      onSuccess: async (created) => {
        queryClient.setQueryData<ApplicationListOutput>(trackedListKey(), (prev) => {
          if (!prev) return [created];
          if (prev.some((row) => row.id === created.id)) {
            return prev.map((row) => (row.id === created.id ? created : row));
          }
          return [created, ...prev];
        });
        await invalidateApplicationsListQueries(queryClient);
        toast.success("Application added to pipeline.");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create application.");
      }
    })
  );
}

export function usePromoteInboxJobMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.promote.mutationOptions({
      onSuccess: async () => {
        await invalidateApplicationsListQueries(queryClient);
      }
    })
  );
}

export function useDismissInboxJobMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.dismiss.mutationOptions({
      onSuccess: async () => {
        await invalidateApplicationsListQueries(queryClient);
      }
    })
  );
}

export function useDismissApplicationFromJdMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.dismissFromHub.mutationOptions({
      onSuccess: async () => {
        await invalidateApplicationsListQueries(queryClient);
        toast.success("Job dismissed.");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to dismiss job.");
      }
    })
  );
}

export function useGenerateApplyPackageFromJdMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.generateApplyPackage.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData<ApplicationListOutput>(trackedListKey(), (prev) => {
          if (!prev) return prev;
          return prev.map((row) => (row.id === data.id ? data : row));
        });
        await invalidateApplicationsListQueries(queryClient);
        toast.success("Apply package draft ready to review.");
      },
      onError: (error) => {
        toastAiError(error.message || "Could not generate apply package", {
          feature: "generic",
          severity: "hard"
        });
      }
    })
  );
}
