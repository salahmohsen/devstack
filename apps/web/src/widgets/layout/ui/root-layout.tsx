import { useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type PropsWithChildren } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";
import { IntersectionProvider } from "@/shared/providers/intersection.provider";

import { DashboardSidebar } from "@/widgets/layout/ui/dashboard-sidebar";
import { PublicSidebar } from "@/widgets/layout/ui/public-sidebar";

import { CommandPalette } from "./command-palette";
import { DashboardBottomBar } from "./dashboard-bottombar";
import {
  SIDE_PANEL_WIDTH,
  SidePanelProvider,
  SidePanelSlot,
  SidePanelToggle,
  useSidePanelSlot
} from "./dashboard-side-panel";
import { GitHubAccessDialog } from "./github-access-dialog";
import { GithubPublicMobileNav } from "./github-public-mobile-nav";
import { Topbar } from "./github-public-topbar";

export function GithubPublicLayout({ children }: PropsWithChildren) {
  const sidePanel = useSidePanelSlot();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const showPanel = isXl && sidePanel.hasContent && !sidePanel.collapsed;
  const isDashboard = useLocation().pathname.includes("dashboard");

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col overflow-hidden",
        "bg-container text-primary selection:bg-[#C0E7C8] selection:text-primary!"
      )}
    >
      <Topbar />

      <SidePanelProvider
        value={{
          node: sidePanel.node,
          collapsed: sidePanel.collapsed,
          hasContent: sidePanel.hasContent,
          toggle: sidePanel.toggle
        }}
      >
        <div className="flex min-h-0 flex-1 flex-row p-2 pt-0">
          <IntersectionProvider>
            <div className="hidden shrink-0 xl:block">
              {!isDashboard && <PublicSidebar />}
              {isDashboard && <DashboardSidebar />}
            </div>
            <div className="relative min-w-0 flex-1 overflow-y-auto rounded-xl border bg-background shadow-xs">
              <main className="flex min-h-[calc(100%-var(--navbar-height))] w-full">
                {children}
              </main>
              <SidePanelToggle />
            </div>
          </IntersectionProvider>

          <motion.div
            initial={false}
            animate={{ width: showPanel ? SIDE_PANEL_WIDTH : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="hidden h-full max-h-[calc(100dvh-var(--navbar-height))] shrink-0 overflow-hidden xl:block"
          >
            <SidePanelSlot
              slotRef={sidePanel.setNode}
              collapsed={sidePanel.collapsed}
              onHasContent={sidePanel.setHasContent}
            />
          </motion.div>
        </div>
      </SidePanelProvider>

      <DashboardBottomBar />
      <GithubPublicMobileNav />
      <GitHubAccessDialog />
      <CommandPalette />
    </div>
  );
}
