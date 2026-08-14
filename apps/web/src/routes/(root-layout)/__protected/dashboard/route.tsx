import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { HubChatProvider } from "@/features/agent-hub";
import { useDetectStacksJobSelector } from "@/features/stacks";

import { HubApplicationsSync } from "@/pages/dashboard/_lib/hub-applications-sync";
import { HubAssistantModal } from "@/pages/dashboard/_lib/hub-assistant-modal";

const DetectStacksResultsHost = lazy(() =>
  import("@/pages/dashboard/projects/ui/detect-stacks-dialog").then((m) => {
    return {
      default: m.DetectStacksResultsHost
    };
  })
);

export const Route = createFileRoute("/(root-layout)/__protected/dashboard")({
  component: DashboardLayout
});

function isDashboardHomePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/dashboard";
}

function DeferredDetectStacksHost() {
  const mount = useDetectStacksJobSelector(
    (state) =>
      state.dialogOpen ||
      state.results != null ||
      state.status === "running" ||
      state.status === "ready"
  );
  if (!mount) return null;
  return (
    <Suspense fallback={null}>
      <DetectStacksResultsHost />
    </Suspense>
  );
}

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showFloater = !isDashboardHomePath(pathname);

  return (
    <HubChatProvider>
      {/* Global: CRM hub tools → refresh New/Tracked/Dismissed */}
      <HubApplicationsSync />
      {/* Detect review survives project form close / in-dashboard navigation */}
      <DeferredDetectStacksHost />
      <Outlet />
      {showFloater ? <HubAssistantModal /> : null}
    </HubChatProvider>
  );
}
