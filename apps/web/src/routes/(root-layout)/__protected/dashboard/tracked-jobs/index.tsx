import { createFileRoute } from "@tanstack/react-router";

import {
  getCountApplicationsQueryOptions,
  getListApplicationsBoardQueryOptions,
  getListApplicationsPageInfiniteOptions
} from "@/features/applications";

import { parseListSearch, resolveJobsFilterParam } from "@/widgets/items-page";

import { TrackedJobsPage } from "@/pages/dashboard/tracked-jobs";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/tracked-jobs/")({
  validateSearch: (raw: Record<string, unknown>) => parseListSearch(raw),
  loaderDeps: ({ search }) => {
    return {
      q: search.q,
      filter: resolveJobsFilterParam({ page: "tracked-jobs", filter: search.filter }),
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  },
  loader: ({ context, deps }) => {
    void context.queryClient.ensureInfiniteQueryData(
      getListApplicationsPageInfiniteOptions({ ...deps, scope: "tracked-jobs" })
    );
    void context.queryClient.ensureQueryData(getListApplicationsBoardQueryOptions(deps));
    void context.queryClient.ensureQueryData(getCountApplicationsQueryOptions("tracked"));
  },
  component: TrackedJobsPage
});
