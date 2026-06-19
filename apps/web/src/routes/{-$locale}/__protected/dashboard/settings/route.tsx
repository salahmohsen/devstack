import { createFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "@/pages/dashboard/settings/ui/settings-layout";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/settings")({
  component: SettingsLayout
});
