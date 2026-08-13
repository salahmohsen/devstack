import { type QueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/**
 * Invalidate full-catalog `experiences.list` (pickers / sort) and paginated
 * `experiences.listPage` (dashboard infinite list).
 */
export async function invalidateExperiencesListQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.experiences.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.experiences.listPage.key() })
  ]);
}
