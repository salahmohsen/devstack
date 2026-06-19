import { createFileRoute } from "@tanstack/react-router";

import { ProfileSettings } from "@/pages/dashboard/settings/ui/profile-settings";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/settings/profile/")({
  component: RouteComponent
});

function RouteComponent() {
  return <ProfileSettings />;
}
