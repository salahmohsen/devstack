import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput, type ApplicationTrackingStatus } from "@tsu-stack/core";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

const LIST_STATUSES: ApplicationTrackingStatus[] = ["inbox", "tracked", "dismissed"];

export function useRegenerateAgentTakeMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.regenerateAgentTake.mutationOptions({
      onSuccess: async (data) => {
        for (const status of LIST_STATUSES) {
          queryClient.setQueryData<ApplicationListOutput>(
            applicationsQueryKeys.list(status),
            (prev) => {
              if (!prev) return prev;
              return prev.map((row) => (row.id === data.id ? data : row));
            }
          );
        }
        queryClient.setQueryData(applicationsQueryKeys.get(data.id), data);
        await Promise.all(
          LIST_STATUSES.map((status) =>
            queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list(status) })
          )
        );
        toast.success("Agent take updated");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          if (error.code === "AI_NOT_CONFIGURED") {
            toastAiError(error.message || "Configure a BYO API key under Settings → AI", {
              feature: "generic",
              severity: "hard",
              action: { label: "AI settings", to: "/dashboard/settings/ai" }
            });
            return;
          }
          if (error.code === "AGENT_FAILED") {
            toastAiError(error.message || "Could not generate agent take", {
              feature: "generic",
              severity: "hard",
              action: { label: "AI settings", to: "/dashboard/settings/ai" }
            });
            return;
          }
        }
        toast.error(error.message || "Failed to generate agent take.");
      }
    })
  );
}
