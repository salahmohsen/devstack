import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { StacksPage } from "@/pages/dashboard/stacks";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/")({
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpcQueryClient.portfolio.stacks.list.queryOptions());
  },
  component: StacksPage
});
