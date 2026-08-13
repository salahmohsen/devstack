"use client";

import { createFileRoute } from "@tanstack/react-router";

import { getListProjectsPageInfiniteOptions } from "@/pages/dashboard/projects/api/list-projects-page.query";
import { ProjectsPage } from "@/pages/dashboard/projects/ui/project-page";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/")({
  component: ProjectsPage,
  loader: ({ context }) => {
    // Prefetch first page only — further pages load via infinite scroll.
    void context.queryClient.ensureInfiniteQueryData(getListProjectsPageInfiniteOptions());
  }
});
