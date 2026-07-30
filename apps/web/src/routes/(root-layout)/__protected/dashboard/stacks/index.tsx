import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { StacksPage } from "@/pages/dashboard/stacks";

const STACKS_LIST_STALE_TIME_MS = 30_000;

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/")({
  loader: ({ context }) => {
    // Prefetch so the page mounts with cache warm (no empty skeleton waterfall).
    void context.queryClient.ensureQueryData({
      ...orpcQueryClient.stacks.list.queryOptions(),
      staleTime: STACKS_LIST_STALE_TIME_MS
    });
  },
  component: StacksPage
});
