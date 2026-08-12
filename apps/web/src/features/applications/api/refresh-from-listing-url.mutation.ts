import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  startRefreshFromListingUrl,
  type StartRefreshFromListingInput
} from "@/features/applications/api/refresh-from-listing-job";
import { useRefreshFromListingJob } from "@/features/applications/lib/refresh-from-listing-store";

/**
 * Fix posting URL — starts a detached refresh job with a sticky multi-step toast
 * that survives navigation (same pattern as Scan job alerts).
 */
export function useRefreshFromListingUrlMutation() {
  const queryClient = useQueryClient();
  const { status } = useRefreshFromListingJob();

  const mutateAsync = useCallback(
    async (input: StartRefreshFromListingInput) => {
      await startRefreshFromListingUrl(queryClient, input);
    },
    [queryClient]
  );

  return {
    mutateAsync,
    mutate: (input: StartRefreshFromListingInput) => {
      void mutateAsync(input);
    },
    isPending: status === "running"
  };
}
