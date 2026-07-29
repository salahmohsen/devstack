import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const mailSmartRulesQueryKeys = {
  list() {
    return orpcQueryClient.mailSmartRules.list.key({});
  }
};

export function getListMailSmartRulesQueryOptions() {
  return orpcQueryClient.mailSmartRules.list.queryOptions({});
}

export function useListMailSmartRulesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...getListMailSmartRulesQueryOptions(),
    enabled: options?.enabled ?? true
  });
}

export type ListMailSmartRulesResult = Awaited<ReturnType<typeof orpcClient.mailSmartRules.list>>;
