import { createFileRoute } from "@tanstack/react-router";

import { getListApplicationsQueryOptions } from "@/features/applications";

import { NewJobsPage } from "@/pages/dashboard/new-jobs";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/new-jobs/")({
  component: NewJobsPage,
  validateSearch: (raw: Record<string, unknown>): { applicationId?: string } => {
    const applicationId = raw.applicationId;
    if (typeof applicationId === "string" && applicationId.length > 0) {
      return { applicationId };
    }
    return {};
  },
  beforeLoad: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(getListApplicationsQueryOptions("inbox"));
  }
});
