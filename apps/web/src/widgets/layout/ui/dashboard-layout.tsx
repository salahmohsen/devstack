import { Outlet } from "@tanstack/react-router";
import { motion } from "motion/react";

import { Separator } from "@tsu-stack/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@tsu-stack/ui/components/sidebar";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { useMediaQuery } from "@/shared/lib/use-media-query";
import { AppSidebar } from "@/shared/ui/app-sidebar";

import { Topbar } from "@/widgets/layout/ui/github-public-topbar";

import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import {
  SIDE_PANEL_WIDTH,
  SidePanelProvider,
  SidePanelSlot,
  SidePanelToggle,
  useSidePanelSlot
} from "./dashboard-side-panel";

export function DashboardLayout() {
  const hasMounted = useIsClient();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const sidePanel = useSidePanelSlot();
  const showPanel = hasMounted && isXl && sidePanel.hasContent && !sidePanel.collapsed;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <header className="flex h-14 shrink-0 items-center gap-2 border-y border-border/80">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator className="mr-2 h-4 opacity-60" orientation="vertical" />
            <DashboardBreadcrumbs />
          </div>
        </header>
        <SidePanelProvider
          value={{
            node: sidePanel.node,
            collapsed: sidePanel.collapsed,
            hasContent: sidePanel.hasContent,
            toggle: sidePanel.toggle
          }}
        >
          <motion.div
            initial={false}
            animate={{
              gridTemplateColumns: showPanel
                ? `minmax(0, 1fr) ${SIDE_PANEL_WIDTH}px`
                : "minmax(0, 1fr) 0px"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="grid flex-1 overflow-hidden"
          >
            <div className="relative flex flex-1 flex-col px-4 py-6 md:px-6">
              <Outlet />
              <SidePanelToggle />
            </div>
            <SidePanelSlot
              slotRef={sidePanel.setNode}
              collapsed={sidePanel.collapsed}
              onHasContent={sidePanel.setHasContent}
            />
          </motion.div>
        </SidePanelProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
