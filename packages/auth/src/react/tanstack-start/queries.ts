import { queryOptions } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#@/index";
import { authClient } from "#@/react/auth-client";

export const authQueryKeys = {
  user: ["user"]
};

const getAuthUser = createIsomorphicFn()
  .server(async () => {
    const session = await auth.api.getSession({
      headers: getRequestHeaders()
    });

    return session?.user ?? null;
  })
  .client(async () => {
    const result = await authClient.getSession();

    return result.data?.user ?? null;
  });

export function getAuthUserQueryOptions() {
  return queryOptions({
    staleTime: 1000 * 60 * 5, // 5 minute (matches /packages/auth/src/index.ts)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always", // To sync auth state across tabs if user signs in/out in another tab
    refetchOnMount: false,
    queryKey: authQueryKeys.user,
    queryFn: () => getAuthUser(),
    retry: 3, // Retry logic for transient failures under high load
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000)
  });
}

export type AuthQueryResult = Awaited<ReturnType<typeof getAuthUser>>;
