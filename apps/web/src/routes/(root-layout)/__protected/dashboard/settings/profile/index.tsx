import { createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ProfileSettings } from "@/pages/dashboard/settings/ui/profile-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/profile/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(orpcQueryClient.profile.get.queryOptions());
  }
});

function RouteComponent() {
  return <ProfileSettings />;
}
