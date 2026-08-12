import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function useScanJobAlertsMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.applications.scanJobAlerts.mutationOptions({
      onSuccess: async (data) => {
        if (data.digestsFound === 0) {
          toast.message("No job-alert digests yet", {
            description: "Sync mail or wait for the next job-alert email, then try again."
          });
          return;
        }
        if (data.queueUnavailable) {
          toast.error("Harvest queue is unavailable", {
            description: "Start the server with Redis so job alerts can be processed."
          });
          return;
        }
        toast.success(
          data.enqueued === 1
            ? "Scanning 1 job-alert digest…"
            : `Scanning ${data.enqueued} job-alert digests…`,
          {
            description:
              "Only listings that pass your Job preferences (min match score) appear under New jobs. Duplicates are skipped. This can take a minute."
          }
        );
        // Workers run Mastra harvest async — poll longer so inbox rows show up.
        const invalidate = () =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("inbox") }),
            queryClient.invalidateQueries({
              queryKey: applicationCountQueryKeys.byStatus("inbox")
            })
          ]);
        await invalidate();
        for (const ms of [5_000, 15_000, 30_000, 60_000, 90_000]) {
          window.setTimeout(() => void invalidate(), ms);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Could not scan job alerts.");
      }
    })
  );
}
