import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import {
  HubChatProvider,
  useDailyBriefHostSelector,
  useEntityFormHostSelector,
  useEntityInspectHostSelector
} from "@/features/agent-hub";
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

const EntityFormHost = lazy(() =>
  import("@/pages/dashboard/_lib/entity-form-host").then((m) => {
    return {
      default: m.EntityFormHost
    };
  })
);

const EntityInspectHost = lazy(() =>
  import("@/pages/dashboard/_lib/entity-inspect-host").then((m) => {
    return {
      default: m.EntityInspectHost
    };
  })
);

const DailyBriefHost = lazy(() =>
  import("@/pages/dashboard/_lib/daily-brief-host").then((m) => {
    return {
      default: m.DailyBriefHost
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

function DeferredEntityFormHost() {
  const mount = useEntityFormHostSelector((state) => state.request != null);
  if (!mount) return null;
  return (
    <Suspense fallback={null}>
      <EntityFormHost />
    </Suspense>
  );
}

function DeferredEntityInspectHost() {
  const mount = useEntityInspectHostSelector((state) => state.request != null);
  if (!mount) return null;
  return (
    <Suspense fallback={null}>
      <EntityInspectHost />
    </Suspense>
  );
}

function DeferredDailyBriefHost() {
  const mount = useDailyBriefHostSelector((state) => state.request != null);
  if (!mount) return null;
  return (
    <Suspense fallback={null}>
      <DailyBriefHost />
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
      {/* Chat-opened evidence forms stay on the current dashboard route */}
      <DeferredEntityFormHost />
      <DeferredEntityInspectHost />
      <DeferredDailyBriefHost />
      <Outlet />
      {showFloater ? <HubAssistantModal /> : null}
    </HubChatProvider>
  );
}
