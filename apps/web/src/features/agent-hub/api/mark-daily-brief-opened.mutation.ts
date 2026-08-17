import { useMutation } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useMarkDailyBriefOpenedMutation() {
  return useMutation(
    orpcQueryClient.agent.markDailyBriefOpened.mutationOptions({
      onError: () => {
        // Cursor miss is safe — next Today reuses the old window.
      }
    })
  );
}
