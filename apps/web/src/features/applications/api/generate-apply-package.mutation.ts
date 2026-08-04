import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput } from "@tsu-stack/core";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useGenerateApplyPackageMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.generateApplyPackage.mutationOptions({
      onSuccess: async (data) => {
        // Seed list cache so package sheet opens with the new draft immediately.
        queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          return prev.map((row) => (row.id === data.id ? data : row));
        });
        queryClient.setQueryData(applicationsQueryKeys.get(data.id), data);
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list() });
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.get(data.id)
        });
        toast.success("Apply package draft ready to review.");
      },
      onError: (error) => {
        toastAiError(error.message || "Could not generate apply package", {
          feature: "generic",
          severity: "hard",
          action: {
            label: "AI settings",
            to: "/dashboard/settings/ai"
          }
        });
      }
    })
  );
}

export type GenerateApplyPackageMutationResult = Awaited<
  ReturnType<typeof orpcClient.applications.generateApplyPackage>
>;
