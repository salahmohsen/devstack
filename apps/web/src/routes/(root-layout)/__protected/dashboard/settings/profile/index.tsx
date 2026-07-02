import { createFileRoute } from "@tanstack/react-router";

import { getProfileQueryOptions } from "@/features/profile";

import { ProfileSettings } from "@/pages/dashboard/settings/ui/profile-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/profile/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getProfileQueryOptions());
  }
});

function RouteComponent() {
  return <ProfileSettings />;
}
