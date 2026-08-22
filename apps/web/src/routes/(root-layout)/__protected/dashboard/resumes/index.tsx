import { createFileRoute } from "@tanstack/react-router";

import { parseListSearch } from "@/widgets/items-page";

import { ResumesPage } from "@/pages/dashboard/resumes";
import { getListResumesQueryOptions } from "@/pages/dashboard/resumes/api/list-resumes.query";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/resumes/")({
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
    void context.queryClient.prefetchQuery(getListResumesQueryOptions(deps));
  },
  component: ResumesPage
});
