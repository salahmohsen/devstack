import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationTrackingStatus } from "@tsu-stack/core";

export const applicationsQueryKeys = {
  list(trackingStatus: ApplicationTrackingStatus = "tracked") {
    return orpcQueryClient.applications.list.queryKey({ input: { trackingStatus } });
  },
  get(id: string) {
    return orpcQueryClient.applications.get.queryKey({ input: { id } });
  },
  activity(applicationId: string) {
    return orpcQueryClient.applications.listActivity.queryKey({
      input: { applicationId }
    });
  }
};

export function getListApplicationsQueryOptions(
  trackingStatus: ApplicationTrackingStatus = "tracked"
) {
  return orpcQueryClient.applications.list.queryOptions({ input: { trackingStatus } });
}

export function useListApplicationsQuery(trackingStatus: ApplicationTrackingStatus = "tracked") {
  return useQuery(getListApplicationsQueryOptions(trackingStatus));
}
