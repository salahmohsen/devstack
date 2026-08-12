import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { type ScanJobAlertsInput } from "@tsu-stack/core";

import { startScanJobAlerts } from "@/features/applications/api/scan-job-alerts-job";
import { useScanJobAlertsJob } from "@/features/applications/lib/scan-job-alerts-store";

/**
 * Manual “Scan job alerts” — enqueues harvest and shows a sticky progress toast
 * that survives navigation while digests process in the background.
 */
export function useScanJobAlertsMutation() {
  const queryClient = useQueryClient();
  const { status } = useScanJobAlertsJob();

  const mutateAsync = useCallback(
    async (input?: ScanJobAlertsInput) => {
      await startScanJobAlerts(queryClient, input);
    },
    [queryClient]
  );

  return {
    mutateAsync,
    mutate: (input?: ScanJobAlertsInput) => {
      void mutateAsync(input);
    },
    /** True while enqueue + background poll tracking is active. */
    isPending: status === "running"
  };
}
