import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const inviteQueryKeys = {
  list() {
    return orpcQueryClient.invite.list.key();
  }
};

export function getListInvitesQueryOptions() {
  return orpcQueryClient.invite.list.queryOptions();
}

export function useListInvitesQuery() {
  return useQuery(getListInvitesQueryOptions());
}

export type ListInvitesQueryResult = Awaited<ReturnType<typeof orpcClient.invite.list>>;
