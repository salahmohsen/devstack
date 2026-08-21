import { createFileRoute } from "@tanstack/react-router";

import { ExperiencesPage } from "@/pages/dashboard/experiences";
import { getListExperiencesPageInfiniteOptions } from "@/pages/dashboard/experiences/api/list-experiences-page.query";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/experiences/")({
  component: ExperiencesPage,
  validateSearch: (raw: Record<string, unknown>): { experienceId?: string } => {
    const experienceId = raw.experienceId;
    if (typeof experienceId === "string" && experienceId.length > 0) {
      return { experienceId };
    }
    return {};
  },
  loader: ({ context }) => {
    // Prefetch first page only — further pages load via infinite scroll.
    void context.queryClient.ensureInfiniteQueryData(getListExperiencesPageInfiniteOptions());
  }
});
