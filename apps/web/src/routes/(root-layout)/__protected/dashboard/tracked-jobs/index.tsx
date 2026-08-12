import { createFileRoute } from "@tanstack/react-router";

import { getListApplicationsQueryOptions } from "@/features/applications";

import { TrackedJobsPage } from "@/pages/dashboard/tracked-jobs";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/tracked-jobs/")({
  component: TrackedJobsPage,
  beforeLoad: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(getListApplicationsQueryOptions("tracked"));
  }
});
