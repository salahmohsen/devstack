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

export type ApplicationListCacheSnapshot = {
  list: ReturnType<QueryClient["getQueriesData"]>;
  listPage: ReturnType<QueryClient["getQueriesData"]>;
  listBoard: ReturnType<QueryClient["getQueriesData"]>;
  get: ReturnType<QueryClient["getQueriesData"]>;
};

function mapApplicationRows(
  queryClient: QueryClient,
  mapRow: (row: ApplicationOutput) => ApplicationOutput
): void {
  for (const status of LIST_STATUSES) {
    queryClient.setQueryData<ApplicationListOutput>(applicationsQueryKeys.list(status), (prev) => {
      if (!prev) return prev;
      return prev.map(mapRow);
    });
  }
  queryClient.setQueriesData<InfiniteData<ApplicationListPageOutput>>(
    { queryKey: orpcQueryClient.applications.listPage.key() },
    (prev) => {
      if (!prev || !("pages" in prev) || !Array.isArray(prev.pages)) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => {
          return { ...page, items: page.items.map(mapRow) };
        })
      };
    }
  );
  queryClient.setQueriesData<ApplicationListBoardOutput>(
    { queryKey: orpcQueryClient.applications.listBoard.key() },
    (prev) => {
      if (!prev || !("items" in prev) || !Array.isArray(prev.items)) return prev;
      return { ...prev, items: prev.items.map(mapRow) };
    }
  );
}

/** Cancel in-flight list / listPage / listBoard fetches before an optimistic write. */
export async function cancelApplicationListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: orpcQueryClient.applications.list.key() }),
    queryClient.cancelQueries({ queryKey: orpcQueryClient.applications.listPage.key() }),
    queryClient.cancelQueries({ queryKey: orpcQueryClient.applications.listBoard.key() })
  ]);
}

export function snapshotApplicationListCaches(
  queryClient: QueryClient
): ApplicationListCacheSnapshot {
  return {
    list: queryClient.getQueriesData({ queryKey: orpcQueryClient.applications.list.key() }),
    listPage: queryClient.getQueriesData({
      queryKey: orpcQueryClient.applications.listPage.key()
    }),
    listBoard: queryClient.getQueriesData({
      queryKey: orpcQueryClient.applications.listBoard.key()
    }),
    get: queryClient.getQueriesData({ queryKey: orpcQueryClient.applications.get.key() })
  };
}

export function restoreApplicationListCaches(
  queryClient: QueryClient,
  snapshot: ApplicationListCacheSnapshot
): void {
  for (const bucket of [snapshot.list, snapshot.listPage, snapshot.listBoard, snapshot.get]) {
    for (const [key, data] of bucket) {
      queryClient.setQueryData(key, data);
    }
  }
}

/** Patch matching rows in list + infinite listPage + listBoard + detail. */
export function patchApplicationFields(
  queryClient: QueryClient,
  id: string,
  patch: Partial<ApplicationOutput>
): void {
  mapApplicationRows(queryClient, (row) => (row.id === id ? { ...row, ...patch } : row));
  queryClient.setQueryData(applicationsQueryKeys.get(id), (prev) => {
    if (!prev) return prev;
    return { ...prev, ...patch };
  });
}

/**
 * Patch a single application across list + detail caches without full list invalidation.
 */
export function patchApplicationInLists(queryClient: QueryClient, data: ApplicationOutput): void {
  patchApplicationFields(queryClient, data.id, data);
}
