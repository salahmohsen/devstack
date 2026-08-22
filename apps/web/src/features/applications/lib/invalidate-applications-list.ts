import { type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/**
 * Invalidate hub/picker `applications.list` plus dashboard `listPage` /
 * `listBoard` keys. Prefix `.key()` matches every input variant.
 */
export async function invalidateApplicationsListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.listPage.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.listBoard.key() })
  ]);
}
