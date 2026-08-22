import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type AdminUserListInput } from "@tsu-stack/core";

export const adminUserQueryKeys = {
  list(input?: AdminUserListInput) {
    return orpcQueryClient.admin.users.list.key({ input });
  },
  detail(id: string) {
    return orpcQueryClient.admin.users.get.key({ input: { id } });
  }
};

export function getListAdminUsersQueryOptions(input?: AdminUserListInput) {
  return orpcQueryClient.admin.users.list.queryOptions({
    input: input ?? {}
  });
}

export function useListAdminUsersQuery(input?: AdminUserListInput) {
  return useQuery(getListAdminUsersQueryOptions(input));
}

export function getAdminUserQueryOptions(id: string) {
  return orpcQueryClient.admin.users.get.queryOptions({
    input: { id }
  });
}

export function useAdminUserQuery(id: string | null) {
  return useQuery({
    ...getAdminUserQueryOptions(id ?? ""),
    enabled: Boolean(id)
  });
}

export type ListAdminUsersQueryResult = Awaited<ReturnType<typeof orpcClient.admin.users.list>>;
