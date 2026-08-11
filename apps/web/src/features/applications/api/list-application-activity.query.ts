import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";

export function getListApplicationActivityQueryOptions(applicationId: string) {
  return orpcQueryClient.applications.listActivity.queryOptions({
    input: { applicationId, limit: 100 }
  });
}

export function useListApplicationActivityQuery(
  applicationId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const id = applicationId ?? "";
  return useQuery({
    ...getListApplicationActivityQueryOptions(id),
    queryKey: applicationsQueryKeys.activity(id),
    enabled: Boolean(applicationId) && (options?.enabled ?? true)
  });
}
