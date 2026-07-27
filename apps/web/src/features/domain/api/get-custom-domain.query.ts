import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const domainQueryKeys = {
  current() {
    return orpcQueryClient.domain.get.key();
  }
};

export function getCustomDomainQueryOptions() {
  return orpcQueryClient.domain.get.queryOptions();
}

export function useGetCustomDomainQuery() {
  return useQuery(getCustomDomainQueryOptions());
}

export type CustomDomainQueryResult = Awaited<ReturnType<typeof orpcClient.domain.get>>;
