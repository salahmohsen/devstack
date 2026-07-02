"use client";

import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ProjectsPage } from "@/pages/dashboard/projects/ui/project-page";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/")({
  component: ProjectsPage,
  loader: async ({ context: { queryClient } }) => {
    await queryClient.prefetchQuery(orpcQueryClient.portfolio.projects.list.queryOptions());
  }
});
