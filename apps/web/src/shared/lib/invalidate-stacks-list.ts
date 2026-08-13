import { type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/**
 * Invalidate full-catalog `stacks.list` (pickers / organize) and paginated
 * `stacks.listPage` (dashboard infinite grid).
 */
export async function invalidateStacksListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.listPage.key() })
  ]);
}
