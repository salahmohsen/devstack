import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput } from "@tsu-stack/core";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useAcceptApplyPackageMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.acceptApplyPackage.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          return prev.map((row) => (row.id === data.id ? { ...row, ...data } : row));
        });
        queryClient.setQueryData(applicationsQueryKeys.get(data.id), (prev) => {
          if (!prev) return prev;
          return { ...prev, ...data };
        });
        await invalidateApplicationsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.get(data.id)
        });
        // Resume list may include the new agent-authored PDF.
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.resume.list.queryKey()
        });
        toast.success("Package accepted — resume and cover letter are ready.");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NO_DRAFT":
              toast.error(
                error.message || "No apply package draft to accept — prepare a package first."
              );
              return;
            case "INVALID_DRAFT":
              toast.error(
                error.message || "Apply package draft is invalid — regenerate the package."
              );
              return;
            case "NOT_FOUND":
              toast.error(error.message || "Application not found.");
              return;
          }
        }

        toastAiError(error.message || "Could not accept apply package", {
          feature: "generic",
          severity: "hard"
        });
      }
    })
  );
}

export type AcceptApplyPackageMutationResult = Awaited<
  ReturnType<typeof orpcClient.applications.acceptApplyPackage>
>;
