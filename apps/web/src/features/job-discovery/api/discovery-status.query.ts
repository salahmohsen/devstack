import { useQuery } from "@tanstack/react-query";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { isDiscoveryRunTerminal } from "@tsu-stack/core";

export function getDiscoveryStatusQueryOptions(userId: string | undefined) {
  const options = orpcQueryClient.jobDiscovery.status.queryOptions({ input: {} });
  return {
    ...options,
    queryKey: [...options.queryKey, { userId }],
    enabled: Boolean(userId),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const response = await orpcClient.jobDiscovery.status({}, { signal });
      if (response.userId !== userId) {
        throw new Error("Your account changed. Refresh to reconnect search status.");
      }
      return response;
    }
  };
}
export function useDiscoveryStatusQuery() {
  const { user } = useAuth();
  return useQuery({
    ...getDiscoveryStatusQueryOptions(user?.id),
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      return run && !isDiscoveryRunTerminal(run.stage) ? 3_000 : 30_000;
    }
  });
}
