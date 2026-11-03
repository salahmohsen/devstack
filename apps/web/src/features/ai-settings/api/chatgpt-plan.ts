import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { aiSettingsQueryKeys } from "@/features/ai-settings/api/get-ai-settings.query";

export function useChatgptPlanStatusQuery() {
  return useQuery(
    orpcQueryClient.chatgptPlan.status.queryOptions({
      staleTime: 30_000,
      refetchOnWindowFocus: false
    })
  );
}

function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orpcQueryClient.chatgptPlan.key() }),
      queryClient.invalidateQueries({ queryKey: aiSettingsQueryKeys.current() }),
      queryClient.invalidateQueries({ queryKey: ["ai-settings", "provider-models"] })
    ]);
  };
}

export function useChatgptPlanStartMutation() {
  return useMutation(orpcQueryClient.chatgptPlan.start.mutationOptions());
}

export function useChatgptPlanCompleteMutation() {
  const refresh = useRefreshAfterChange();
  return useMutation(orpcQueryClient.chatgptPlan.complete.mutationOptions({ onSuccess: refresh }));
}

export function useChatgptPlanDisconnectMutation() {
  const refresh = useRefreshAfterChange();
  return useMutation(
    orpcQueryClient.chatgptPlan.disconnect.mutationOptions({ onSuccess: refresh })
  );
}
