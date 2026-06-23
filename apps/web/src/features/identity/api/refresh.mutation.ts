import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getRefreshMutationOptions() {
  return orpc.identity.refresh.mutationOptions();
}
