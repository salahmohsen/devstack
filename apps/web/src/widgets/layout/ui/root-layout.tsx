import { useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type PropsWithChildren } from "react";

import { ScrollArea } from "@tsu-stack/ui/components/scroll-area.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";
import { IntersectionProvider } from "@/shared/providers/intersection.provider";

import { PublicSidebar } from "@/widgets/layout/ui/public-sidebar";

import { CommandPalette } from "./command-palette";
import { DashboardBottomBar } from "./dashboard-bottombar";
import { GitHubAccessDialog } from "./github-access-dialog";
import { MobileNav } from "./github-public-mobile-nav";
import { Topbar } from "./github-public-topbar";
import {
  DASHBOARD_SIDE_PANEL_WIDTH,
  PUBLIC_SIDE_PANEL_WIDTH,
  SidePanelProvider,
  SidePanelSlot,
  SidePanelToggle,
  useSidePanelSlot
} from "./side-panel";

export function RootLayout({ children }: PropsWithChildren) {
  const sidePanel = useSidePanelSlot();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const showPanel = isXl && sidePanel.hasContent && !sidePanel.collapsed;
  const isDashboard = useLocation().pathname.includes("dashboard");

  return (
    <div
      className={cn(
        "relative isolate flex min-h-svh flex-col",
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
        <div className="flex max-h-[calc(100dvh-var(--navbar-height))] min-h-0 flex-1 flex-row p-2 pt-0">
          <IntersectionProvider>
            <div className="hidden shrink-0 xl:block">{<PublicSidebar />}</div>
            <div className="relative min-w-0 flex-1 overflow-y-hidden">
              <main className="relative flex h-[calc(100dvh-var(--navbar-height)-10px)] w-full overflow-hidden rounded-2xl bg-background text-card-foreground shadow-xs/5 not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
                <ScrollArea scrollFade fill clampContentMinWidth={true}>
                  {children}
                </ScrollArea>
              </main>
              <SidePanelToggle />
            </div>
          </IntersectionProvider>

          <motion.div
            initial={false}
            animate={{
              width: showPanel
                ? isDashboard
                  ? DASHBOARD_SIDE_PANEL_WIDTH
                  : PUBLIC_SIDE_PANEL_WIDTH
                : 0
            }}
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
      <MobileNav />
      <GitHubAccessDialog />
      <CommandPalette />
    </div>
  );
}
