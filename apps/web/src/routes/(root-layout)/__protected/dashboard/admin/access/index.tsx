import { createFileRoute } from "@tanstack/react-router";

import { getAdminAccessQueryOptions } from "@/features/admin";

import { AdminAccessPage } from "@/pages/dashboard/admin";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/admin/access/")({
  component: AdminAccessPage,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getAdminAccessQueryOptions());
  }
});
