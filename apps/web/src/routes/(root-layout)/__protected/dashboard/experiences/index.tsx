import { createFileRoute } from "@tanstack/react-router";

import { parseListSearch } from "@/widgets/items-page";

import { ExperiencesPage } from "@/pages/dashboard/experiences";
import { getListExperiencesPageInfiniteOptions } from "@/pages/dashboard/experiences/api/list-experiences-page.query";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/experiences/")({
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
    void context.queryClient.ensureInfiniteQueryData(getListExperiencesPageInfiniteOptions(deps));
  },
  component: ExperiencesPage
});
