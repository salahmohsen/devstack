import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getReviewQueryOptions(id: string) {
  return orpcQueryClient.review.get.queryOptions({
    input: { id }
  });
}

export function useGetReviewQuery(id: string | null | undefined, options?: { enabled?: boolean }) {
  const resolvedId = id ?? "";
  return useQuery({
    ...getReviewQueryOptions(resolvedId),
    enabled: (options?.enabled ?? true) && Boolean(resolvedId)
  });
}

export type GetReviewQueryResult = Awaited<ReturnType<typeof orpcClient.review.get>>;
