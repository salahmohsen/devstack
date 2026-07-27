import { createFileRoute } from "@tanstack/react-router";

import { getListInvitesQueryOptions } from "@/features/invite";

import { InviteSettings } from "@/pages/dashboard/settings/ui/invite-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/invites/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getListInvitesQueryOptions());
  }
});

function RouteComponent() {
  return <InviteSettings />;
}
