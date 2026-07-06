import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ResumesPage } from "@/pages/dashboard/resumes";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/resumes/")({
  component: ResumesPage,
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.resume.list.queryOptions());
  }
});
