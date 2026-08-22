import { type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type ApplicationListBoardOutput,
  type ApplicationListOutput,
  type ApplicationListPageOutput,
  type ApplicationOutput,
  type ApplicationTrackingStatus
} from "@tsu-stack/core";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

const LIST_STATUSES: ApplicationTrackingStatus[] = ["inbox", "tracked", "dismissed"];

function patchRow(row: ApplicationOutput, data: ApplicationOutput): ApplicationOutput {
  return row.id === data.id ? { ...row, ...data } : row;
}

/**
 * Patch a single application across list + detail caches without full list invalidation.
 */
export function patchApplicationInLists(queryClient: QueryClient, data: ApplicationOutput): void {
  for (const status of LIST_STATUSES) {
    queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(status), (prev) => {
      if (!prev) return prev;
      return prev.map((row) => patchRow(row, data));
    });
  }
  queryClient.setQueriesData<InfiniteData<ApplicationListPageOutput>>(
    { queryKey: orpcQueryClient.applications.listPage.key() },
    (prev) => {
      if (!prev || !("pages" in prev) || !Array.isArray(prev.pages)) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => {
          return { ...page, items: page.items.map((row) => patchRow(row, data)) };
        })
      };
    }
  );
  queryClient.setQueriesData<ApplicationListBoardOutput>(
    { queryKey: orpcQueryClient.applications.listBoard.key() },
    (prev) => {
      if (!prev || !("items" in prev) || !Array.isArray(prev.items)) return prev;
      return { ...prev, items: prev.items.map((row) => patchRow(row, data)) };
    }
  );
  queryClient.setQueryData(applicationsQueryKeys.get(data.id), (prev) => {
    if (!prev) return prev;
    return { ...prev, ...data };
  });
}
