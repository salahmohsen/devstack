import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const connectionsQueryKeys = {
  status() {
    return orpcQueryClient.connections.getStatus.key({});
  }
};

export function getConnectionsStatusQueryOptions() {
  return orpcQueryClient.connections.getStatus.queryOptions({});
}

export function useGetConnectionsStatusQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...getConnectionsStatusQueryOptions(),
    enabled: options?.enabled ?? true
  });
}

export type ConnectionsStatusQueryResult = Awaited<
  ReturnType<typeof orpcClient.connections.getStatus>
>;
