import { type QueryClient } from "@tanstack/react-query";

import {
  type ApplicationListOutput,
  type ApplicationOutput,
  type ApplicationTrackingStatus
} from "@tsu-stack/core";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

const LIST_STATUSES: ApplicationTrackingStatus[] = ["inbox", "tracked", "dismissed"];

/**
 * Patch a single application across list + detail caches without full list invalidation.
 */
export function patchApplicationInLists(queryClient: QueryClient, data: ApplicationOutput): void {
  for (const status of LIST_STATUSES) {
    queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(status), (prev) => {
      if (!prev) return prev;
      return prev.map((row) => (row.id === data.id ? data : row));
    });
  }
  queryClient.setQueryData(applicationsQueryKeys.get(data.id), data);
}
