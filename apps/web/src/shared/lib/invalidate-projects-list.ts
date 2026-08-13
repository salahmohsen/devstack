import { type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/**
 * Invalidate full-catalog `projects.list` (pickers / sort) and paginated
 * `projects.listPage` (dashboard infinite list).
 */
export async function invalidateProjectsListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.projects.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.projects.listPage.key() })
  ]);
}
