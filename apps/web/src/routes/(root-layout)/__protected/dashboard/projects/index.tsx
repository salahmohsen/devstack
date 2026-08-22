"use client";

import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { parseListSearch } from "@/widgets/items-page";

import { getListProjectsPageInfiniteOptions } from "@/pages/dashboard/projects/api/list-projects-page.query";
import { ProjectsPage } from "@/pages/dashboard/projects/ui/project-page";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/")({
  validateSearch: (raw: Record<string, unknown>) => parseListSearch(raw),
  loaderDeps: ({ search }) => {
    return {
      q: search.q,
      filter: search.filter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  },
  loader: ({ context, deps }) => {
    void context.queryClient.ensureInfiniteQueryData(getListProjectsPageInfiniteOptions(deps));
    void context.queryClient.ensureQueryData(orpcQueryClient.stacks.list.queryOptions());
  },
  component: ProjectsPage
});
