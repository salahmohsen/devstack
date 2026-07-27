import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/** Base key — invalidates every default-resume query regardless of profileName. */
export function getDefaultResumeQueryKey() {
  return orpcQueryClient.resume.getDefault.key();
}

export function getDefaultResumeQueryOptions(profileName: string) {
  return orpcQueryClient.resume.getDefault.queryOptions({
    input: { profileName }
  });
}

export function useGetDefaultResumeQuery(profileName: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...getDefaultResumeQueryOptions(profileName),
    enabled: (options?.enabled ?? true) && Boolean(profileName)
  });
}

export type DefaultResumeQueryResult = Awaited<ReturnType<typeof orpcClient.resume.getDefault>>;
