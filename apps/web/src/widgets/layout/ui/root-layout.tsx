import { motion } from "motion/react";
import { type PropsWithChildren } from "react";

import { SidebarProvider } from "@tsu-stack/ui/components/sidebar";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";

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
  const hasMounted = useIsClient();
  const sidePanel = useSidePanelSlot();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const showPanel = hasMounted && isXl && sidePanel.hasContent && !sidePanel.collapsed;

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        "bg-container text-primary selection:bg-[#C0E7C8] selection:text-primary!"
      )}
    >
      <Topbar />
      <SidebarProvider>
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
            className="grid flex-1 overflow-hidden p-2 pt-0"
          >
            <div className="relative overflow-hidden rounded-xl border bg-background shadow-xs">
              <main className="flex h-full">{children}</main>
              <SidePanelToggle />
            </div>

            <SidePanelSlot
              slotRef={sidePanel.setNode}
              collapsed={sidePanel.collapsed}
              onHasContent={sidePanel.setHasContent}
            />
          </motion.div>
        </SidePanelProvider>
      </SidebarProvider>

      <DashboardBottomBar />
      <GithubPublicMobileNav />
      <GitHubAccessDialog />
      <CommandPalette />
    </div>
  );
}
