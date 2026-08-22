import { createFileRoute } from "@tanstack/react-router";

import {
  getCountApplicationsQueryOptions,
  getListApplicationsPageInfiniteOptions
} from "@/features/applications";

import { parseListSearch, resolveJobsFilterParam } from "@/widgets/items-page";

import { NewJobsPage } from "@/pages/dashboard/new-jobs";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/new-jobs/")({
  validateSearch: (raw: Record<string, unknown>) => parseListSearch(raw),
  loaderDeps: ({ search }) => {
    return {
      q: search.q,
      filter: resolveJobsFilterParam({ page: "new-jobs", filter: search.filter }),
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  },
  loader: ({ context, deps }) => {
    void context.queryClient.ensureInfiniteQueryData(
      getListApplicationsPageInfiniteOptions({ ...deps, scope: "new-jobs" })
    );
    void context.queryClient.ensureQueryData(getCountApplicationsQueryOptions("inbox"));
    void context.queryClient.ensureQueryData(getCountApplicationsQueryOptions("dismissed"));
  },
  component: NewJobsPage
});
