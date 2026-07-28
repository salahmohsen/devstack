import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ResumesPage } from "@/pages/dashboard/resumes";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/resumes/")({
  component: ResumesPage,
  validateSearch: (raw: Record<string, unknown>): { resumeId?: string } => {
    const resumeId = raw.resumeId;
    if (typeof resumeId === "string" && resumeId.length > 0) {
      return { resumeId };
    }
    return {};
  },
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.resume.list.queryOptions());
  }
});
