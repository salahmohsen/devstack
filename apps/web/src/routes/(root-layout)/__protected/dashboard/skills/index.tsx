import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { parseListSearch } from "@/widgets/items-page";

import { StacksPage } from "@/pages/dashboard/stacks";
import { getListStacksPageInfiniteOptions } from "@/pages/dashboard/stacks/api/list-stacks-page.query";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/skills/")({
  validateSearch: (raw: Record<string, unknown>) => parseListSearch(raw),
  loaderDeps: ({ search }) => {
    return {
      q: search.q,
      filter: search.filter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  },
  loader: ({ context, deps }) => {
    void context.queryClient.ensureInfiniteQueryData(getListStacksPageInfiniteOptions(deps));
    void context.queryClient.ensureQueryData(orpcQueryClient.projects.list.queryOptions());
  },
  component: StacksPage
});
