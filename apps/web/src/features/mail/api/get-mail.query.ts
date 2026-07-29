import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getMailQueryOptions(id: string, includeSystem = false) {
  return orpcQueryClient.mail.get.queryOptions({
    input: { id, includeSystem }
  });
}

export function useGetMailQuery(
  id: string | null | undefined,
  options?: { enabled?: boolean; includeSystem?: boolean }
) {
  const resolvedId = id ?? "";
  return useQuery({
    ...getMailQueryOptions(resolvedId, options?.includeSystem),
    enabled: (options?.enabled ?? true) && Boolean(resolvedId)
  });
}

export type GetMailQueryResult = Awaited<ReturnType<typeof orpcClient.mail.get>>;
