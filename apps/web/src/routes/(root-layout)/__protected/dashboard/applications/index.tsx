import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ApplicationsPage } from "@/pages/dashboard/applications";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/applications/")({
  component: ApplicationsPage,
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.applications.list.queryOptions());
  }
});
