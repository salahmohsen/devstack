import { createFileRoute, redirect } from "@tanstack/react-router";

import { DASHBOARD_AGENT_PATH } from "@/shared/lib/dashboard-paths";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/")({
  beforeLoad: () => {
    throw redirect({ to: DASHBOARD_AGENT_PATH });
  }
});
