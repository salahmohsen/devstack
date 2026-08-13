import { Outlet, createFileRoute } from "@tanstack/react-router";

import { HubChatProvider } from "@/features/agent-hub";

import { HubApplicationsSync } from "@/pages/dashboard/_lib/hub-applications-sync";
import { DetectStacksResultsHost } from "@/pages/dashboard/projects/ui/detect-stacks-dialog";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard")({
  component: DashboardLayout
});

function DashboardLayout() {
  return (
    <HubChatProvider>
      {/* Global: create-application + generate-apply-package → refresh New/Tracked/Dismissed */}
      <HubApplicationsSync />
      {/* Detect review survives project form close / in-dashboard navigation */}
      <DetectStacksResultsHost />
      <Outlet />
    </HubChatProvider>
  );
}
