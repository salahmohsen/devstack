import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationListOutput } from "@tsu-stack/core";

import { toastAiError } from "@/shared/lib/toast-ai-error";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import { invalidateApplicationsListQueries } from "@/features/applications/lib/invalidate-applications-list";

export function useSendOutreachMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.applications.sendOutreach.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          return prev.map((row) => (row.id === data.id ? { ...row, ...data } : row));
        });
        await invalidateApplicationsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.get(data.id)
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.mail.list.key({ type: "query" })
        });
        toast.success(
          data.stage === "applied"
            ? "Outreach sent — stage moved to Applied."
            : "Outreach email sent with attachments."
        );
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NO_RESUME":
              toast.error(error.message || "Link a resume before sending outreach.");
              return;
            case "NO_RECIPIENT":
              toast.error(error.message || "Set a valid recruiter email before sending outreach.");
              return;
            case "MAIL_NOT_CONFIGURED":
              toastAiError(
                error.message || "Configure Resend under Settings → Integrations before sending.",
                {
                  feature: "generic",
                  severity: "hard",
                  action: {
                    label: "Integrations",
                    to: "/dashboard/settings/connections"
                  }
                }
              );
              return;
            case "CLOSED":
              toast.error(error.message || "Cannot send outreach for a closed application.");
              return;
            case "SEND_FAILED":
              toast.error(error.message || "Failed to send outreach email.");
              return;
            case "NOT_FOUND":
              toast.error(error.message || "Application not found.");
              return;
          }
        }

        toastAiError(error.message || "Could not send outreach", {
          feature: "generic",
          severity: "hard",
          action: {
            label: "Integrations",
            to: "/dashboard/settings/connections"
          }
        });
      }
    })
  );
}

export type SendOutreachMutationResult = Awaited<
  ReturnType<typeof orpcClient.applications.sendOutreach>
>;
