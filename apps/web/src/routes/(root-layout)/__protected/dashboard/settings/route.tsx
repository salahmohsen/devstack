import { createFileRoute, redirect } from "@tanstack/react-router";

import { SettingsLayout } from "@/pages/dashboard/settings/ui/settings-layout";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings")({
  component: SettingsLayout,
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "");
    if (path === "/dashboard/settings") {
      throw redirect({ to: "/dashboard/settings/profile" });
    }
  }
});
