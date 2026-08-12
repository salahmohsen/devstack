import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationTrackingStatus } from "@tsu-stack/core";

export const applicationCountQueryKeys = {
  byStatus(trackingStatus: ApplicationTrackingStatus) {
    return orpcQueryClient.applications.count.queryKey({ input: { trackingStatus } });
  }
};

export function getCountApplicationsQueryOptions(trackingStatus: ApplicationTrackingStatus) {
  return orpcQueryClient.applications.count.queryOptions({
    input: { trackingStatus }
  });
}

export function useCountApplicationsQuery(
  trackingStatus: ApplicationTrackingStatus,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    ...getCountApplicationsQueryOptions(trackingStatus),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval
  });
}
