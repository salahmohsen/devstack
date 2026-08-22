import { type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/**
 * Invalidate hub/picker `applications.list` plus dashboard `listPage` /
 * `listBoard` keys. Prefix `.key()` matches every input variant.
 *
 * Lives in shared so mail / hub can call it without a cross-feature import.
 */
export async function invalidateApplicationsListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.listPage.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.listBoard.key() })
  ]);
}
