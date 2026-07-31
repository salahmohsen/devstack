import { createFileRoute } from "@tanstack/react-router";

import { getJobPreferenceQueryOptions } from "@/features/job-preference";

import { JobSettings } from "@/pages/dashboard/settings/ui/job-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/jobs/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getJobPreferenceQueryOptions());
  },
  component: JobSettings
});
