import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getRefreshMutationOptions() {
  return orpcQueryClient.identity.refresh.mutationOptions();
}
