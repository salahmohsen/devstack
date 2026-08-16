import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationTrackingStatus } from "@tsu-stack/core";

export function applicationsByTrackingQueryOptions(trackingStatus: ApplicationTrackingStatus) {
  return orpcQueryClient.applications.list.queryOptions({
    input: { trackingStatus }
  });
}

export function useApplicationsByTrackingQuery(trackingStatus: ApplicationTrackingStatus) {
  return useQuery(applicationsByTrackingQueryOptions(trackingStatus));
}
