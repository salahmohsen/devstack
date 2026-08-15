import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { type FindJobsNowInput } from "@tsu-stack/core";

import { startFindJobsNow } from "@/features/job-discovery/api/find-jobs-now-job";
import { useFindJobsNowJob } from "@/features/job-discovery/lib/find-jobs-now-store";

/**
 * Manual “Find jobs now” — enqueues ingest (if the shelf is thin) + land and
 * shows a sticky progress toast that survives navigation.
 */
export function useFindJobsNowMutation() {
  const queryClient = useQueryClient();
  const { status } = useFindJobsNowJob();

  const mutateAsync = useCallback(
    async (input?: FindJobsNowInput) => {
      await startFindJobsNow(queryClient, input);
    },
    [queryClient]
  );

  return {
    mutateAsync,
    mutate: (input?: FindJobsNowInput) => {
      void mutateAsync(input);
    },
    /** True while enqueue + background poll tracking is active. */
    isPending: status === "running"
  };
}
