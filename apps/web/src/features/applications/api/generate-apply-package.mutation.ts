import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput } from "@tsu-stack/core";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useGenerateApplyPackageMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.generateApplyPackage.mutationOptions({
      onSuccess: (data) => {
        // Seed list cache so package sheet / accept can proceed immediately.
        // Do not await invalidation — Review-off chains accept next and waiting
        // here added multi-second dead time after a ~60s LLM generate.
        queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          return prev.map((row) => (row.id === data.id ? { ...row, ...data } : row));
        });
        queryClient.setQueryData(applicationsQueryKeys.get(data.id), (prev) => {
          if (!prev) return prev;
          return { ...prev, ...data };
        });
        void Promise.all([
          invalidateApplicationsListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.get(data.id)
          }),
          queryClient.invalidateQueries({
            queryKey: applicationsQueryKeys.activity(data.id)
          })
        ]);
        toast.success("Apply package drafted.");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NO_EVIDENCE":
              toast.error(
                error.message ||
                  "No portfolio experiences or projects opted in for resume evidence."
              );
              return;
            case "AI_NOT_CONFIGURED":
              toastAiError(error.message || "Configure a BYO API key under Settings → AI", {
                feature: "generic",
                severity: "hard",
                action: {
                  label: "AI settings",
                  to: "/dashboard/settings/ai"
                }
              });
              return;
            case "AGENT_FAILED":
              toastAiError(
                error.message || "Apply package generation failed — check Settings → AI.",
                {
                  feature: "generic",
                  severity: "hard",
                  action: {
                    label: "AI settings",
                    to: "/dashboard/settings/ai"
                  }
                }
              );
              return;
            case "NOT_FOUND":
              toast.error(error.message || "Application not found.");
              return;
          }
        }

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
