import { Outlet, createFileRoute } from "@tanstack/react-router";

import { HubChatProvider } from "@/features/agent-hub";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard")({
  component: DashboardLayout
});

function DashboardLayout() {
  return (
    <HubChatProvider>
      <Outlet />
    </HubChatProvider>
  );
}
