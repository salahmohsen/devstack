import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type MailListCategory } from "@tsu-stack/core";

export type ListMailInput = {
  category: MailListCategory;
  includeSystem?: boolean;
  limit?: number;
};

export const mailQueryKeys = {
  list(input: ListMailInput) {
    return orpcQueryClient.mail.list.key({ input });
  },
  get(id: string) {
    return orpcQueryClient.mail.get.key({ input: { id } });
  }
};

export function getListMailQueryOptions(input: ListMailInput) {
  return orpcQueryClient.mail.list.queryOptions({
    input: {
      category: input.category,
      includeSystem: input.includeSystem,
      limit: input.limit
    }
  });
}

export function useListMailQuery(input: ListMailInput, options?: { enabled?: boolean }) {
  return useQuery({
    ...getListMailQueryOptions(input),
    enabled: options?.enabled ?? true
  });
}

export type ListMailQueryResult = Awaited<ReturnType<typeof orpcClient.mail.list>>;
