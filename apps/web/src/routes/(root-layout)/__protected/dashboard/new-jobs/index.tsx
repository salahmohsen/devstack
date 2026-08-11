import { createFileRoute } from "@tanstack/react-router";

import { getListApplicationsQueryOptions } from "@/features/applications";

import { NewJobsPage } from "@/pages/dashboard/new-jobs";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/new-jobs/")({
  component: NewJobsPage,
  beforeLoad: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(getListApplicationsQueryOptions("inbox"));
  }
});
