import { createFileRoute } from "@tanstack/react-router";

import { getListApplicationsQueryOptions } from "@/features/applications";

import { ApplicationsPage } from "@/pages/dashboard/applications";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/tracked-jobs/")({
  component: ApplicationsPage,
  beforeLoad: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(getListApplicationsQueryOptions("tracked"));
  }
});
