import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  startRegenerateAgentTake,
  type StartRegenerateAgentTakeInput
} from "@/features/applications/api/regenerate-agent-take-job";
import { useAgentTakeJob } from "@/features/applications/lib/agent-take-store";

/**
 * Regenerate agent take — detached job with sticky multi-step toast
 * (same pattern as Fix posting URL / Scan job alerts).
 */
export function useRegenerateAgentTakeMutation() {
  const queryClient = useQueryClient();
  const { status } = useAgentTakeJob();

  const mutateAsync = useCallback(
    async (input: StartRegenerateAgentTakeInput) => {
      await startRegenerateAgentTake(queryClient, input);
    },
    [queryClient]
  );

  return {
    mutateAsync,
    mutate: (input: StartRegenerateAgentTakeInput) => {
      void mutateAsync(input);
    },
    isPending: status === "running"
  };
}
