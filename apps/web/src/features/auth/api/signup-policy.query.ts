import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getSignupPolicyQueryOptions() {
  return orpcQueryClient.signupPolicy.get.queryOptions();
}

export function useSignupPolicyQuery() {
  return useQuery(getSignupPolicyQueryOptions());
}
