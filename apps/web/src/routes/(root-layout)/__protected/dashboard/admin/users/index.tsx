import { createFileRoute } from "@tanstack/react-router";

import { getListAdminUsersQueryOptions } from "@/features/admin";

import { AdminUsersPage } from "@/pages/dashboard/admin";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/admin/users/")({
  component: AdminUsersPage,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getListAdminUsersQueryOptions());
  }
});
