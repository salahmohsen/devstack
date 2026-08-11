import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/** Base key — invalidates every default-resume query regardless of username. */
export function getDefaultResumeQueryKey() {
  return orpcQueryClient.resume.getDefault.key();
}

export function getDefaultResumeQueryOptions(username: string) {
  return orpcQueryClient.resume.getDefault.queryOptions({
    input: { username }
  });
}

export function useGetDefaultResumeQuery(username: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...getDefaultResumeQueryOptions(username),
    enabled: (options?.enabled ?? true) && Boolean(username)
  });
}

export type DefaultResumeQueryResult = Awaited<ReturnType<typeof orpcClient.resume.getDefault>>;
