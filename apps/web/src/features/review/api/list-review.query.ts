import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ReviewItemStatus } from "@tsu-stack/core";

export type ListReviewInput = {
  status?: ReviewItemStatus;
  limit?: number;
};

export const reviewQueryKeys = {
  list(input: ListReviewInput = {}) {
    return orpcQueryClient.review.list.key({
      input: { status: input.status ?? "pending", limit: input.limit }
    });
  },
  get(id: string) {
    return orpcQueryClient.review.get.key({ input: { id } });
  }
};

export function getListReviewQueryOptions(input: ListReviewInput = {}) {
  return orpcQueryClient.review.list.queryOptions({
    input: {
      status: input.status ?? "pending",
      limit: input.limit
    }
  });
}

export function useListReviewQuery(input: ListReviewInput = {}, options?: { enabled?: boolean }) {
  return useQuery({
    ...getListReviewQueryOptions(input),
    enabled: options?.enabled ?? true
  });
}

export type ListReviewQueryResult = Awaited<ReturnType<typeof orpcClient.review.list>>;
