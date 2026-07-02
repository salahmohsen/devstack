import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ExperiencesPage } from "@/pages/dashboard/experiences";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/experiences/")({
  component: ExperiencesPage,
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
  }
});
