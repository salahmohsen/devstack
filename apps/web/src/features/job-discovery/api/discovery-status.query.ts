import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { isDiscoveryRunTerminal } from "@tsu-stack/core";

export function getDiscoveryStatusQueryOptions() {
  return orpcQueryClient.jobDiscovery.status.queryOptions({ input: {} });
}
export function useDiscoveryStatusQuery() {
  return useQuery({
    ...getDiscoveryStatusQueryOptions(),
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      return run && !isDiscoveryRunTerminal(run.stage) ? 3_000 : false;
    }
  });
}
