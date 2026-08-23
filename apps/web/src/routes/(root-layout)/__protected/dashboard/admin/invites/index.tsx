import { createFileRoute } from "@tanstack/react-router";

import { getListAdminInvitesQueryOptions } from "@/features/admin";

import { AdminInvitesPage } from "@/pages/dashboard/admin";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/admin/invites/")({
  component: AdminInvitesPage,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getListAdminInvitesQueryOptions());
  }
});
