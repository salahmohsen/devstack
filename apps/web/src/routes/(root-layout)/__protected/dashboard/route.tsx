import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { HubChatProvider } from "@/features/agent-hub";

import { HubAssistantModal } from "@/widgets/agent-hub";

import { HubApplicationsSync } from "@/pages/dashboard/_lib/hub-applications-sync";
import { DetectStacksResultsHost } from "@/pages/dashboard/projects/ui/detect-stacks-dialog";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard")({
  component: DashboardLayout
});

function isDashboardHomePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/dashboard";
}

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showFloater = !isDashboardHomePath(pathname);

  return (
    <HubChatProvider>
      {/* Global: CRM hub tools → refresh New/Tracked/Dismissed */}
      <HubApplicationsSync />
      {/* Detect review survives project form close / in-dashboard navigation */}
      <DetectStacksResultsHost />
      <Outlet />
      {showFloater ? <HubAssistantModal /> : null}
    </HubChatProvider>
  );
}
