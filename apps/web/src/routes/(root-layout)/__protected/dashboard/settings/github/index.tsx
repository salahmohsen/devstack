import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { GithubSettings } from "@/pages/dashboard";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/github/")({
  component: GithubSettings,
  loader: async ({ context }) =>
    await context.queryClient.prefetchQuery(orpcQueryClient.githubConfig.get.queryOptions())
});
