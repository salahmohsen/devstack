import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { GithubSettings } from "@/pages/dashboard";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/github/")({
  component: GithubSettings,
  loader: ({ context }) => context.queryClient.prefetchQuery(orpc.githubConfig.get.queryOptions())
});
