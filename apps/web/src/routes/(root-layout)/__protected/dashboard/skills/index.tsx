import { createFileRoute } from "@tanstack/react-router";

import { StacksPage } from "@/pages/dashboard/stacks";
import { getListStacksPageInfiniteOptions } from "@/pages/dashboard/stacks/api/list-stacks-page.query";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/skills/")({
  validateSearch: (raw: Record<string, unknown>): { stackId?: string } => {
    const stackId = raw.stackId;
    if (typeof stackId === "string" && stackId.length > 0) {
      return { stackId };
    }
    return {};
  },
  loader: ({ context }) => {
    // Prefetch first page only — further pages load via infinite scroll.
    void context.queryClient.ensureInfiniteQueryData(getListStacksPageInfiniteOptions());
  },
  component: StacksPage
});
