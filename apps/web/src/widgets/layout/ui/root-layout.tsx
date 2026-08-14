import { useLocation } from "@tanstack/react-router";
import { type PropsWithChildren } from "react";

import { ScrollArea } from "@tsu-stack/ui/components/scroll-area.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";
import { IntersectionProvider } from "@/shared/providers/intersection.provider";

import { ClipWidth } from "@/widgets/layout/ui/clip-width";
import { DASHBOARD_NAV_DEFAULT_WIDTH, PublicSidebar } from "@/widgets/layout/ui/sidebar";

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
  const showPanel = isXl && (sidePanel.hasContent || sidePanel.inspectOpen) && !sidePanel.collapsed;
  const pathname = useLocation().pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  // Public repos list inspects portfolio projects with the same chrome as dashboard.
  const isPublicReposList = /(?:^|\/)repos\/?$/.test(pathname);
  const panelWidth =
    isDashboard || isPublicReposList ? DASHBOARD_SIDE_PANEL_WIDTH : PUBLIC_SIDE_PANEL_WIDTH;

  return (
    <div
      className={cn(
        // Fixed viewport height + overflow-hidden: only the main Card ScrollArea scrolls
        // (no second browser/document scrollbar beside the shell).
        "relative isolate flex h-dvh max-h-dvh flex-col overflow-hidden",
        "bg-container text-primary selection:bg-[#C0E7C8] selection:text-primary!",
        // Instant open/close when the user prefers reduced motion.
        "motion-reduce:[&_[data-dashboard-nav-shell]]:transition-none motion-reduce:[&_[data-side-panel-shell]]:transition-none"
      )}
    >
      <Topbar />

      <SidePanelProvider
        value={{
          node: sidePanel.node,
          collapsed: sidePanel.collapsed,
          hasContent: sidePanel.hasContent,
          inspectOpen: sidePanel.inspectOpen,
          requestInspectOpen: sidePanel.requestInspectOpen,
          releaseInspectOpen: sidePanel.releaseInspectOpen,
          toggle: sidePanel.toggle
        }}
      >
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden p-2 pt-0">
          <IntersectionProvider>
            <ClipWidth
              open={isDashboard}
              contentWidth={DASHBOARD_NAV_DEFAULT_WIDTH}
              unlockWhenOpen
              unmountClosed
              data-dashboard-nav-shell=""
              className="hidden h-full xl:block"
            >
              <PublicSidebar />
            </ClipWidth>
            {/*
              One surface: main + panel share the same rounded-2xl shell.
              Panel width animates; facing edges stay square; a 1px rule is the only seam.
            */}
            <div
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
                "not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
              )}
            >
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <main className="relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-background">
                  <div className="size-full min-h-0 min-w-0">
                    <ScrollArea scrollFade fill clampContentMinWidth={true}>
                      {children}
                    </ScrollArea>
                  </div>
                </main>
                <SidePanelToggle />
              </div>

              <ClipWidth
                open={showPanel}
                contentWidth={panelWidth}
                overlay
                data-side-panel-shell=""
                className="hidden h-full xl:flex"
              >
                <div className="flex h-full min-h-0">
                  <div aria-hidden className="w-px shrink-0 self-stretch bg-border" />
                  <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                    <SidePanelSlot
                      slotRef={sidePanel.setNode}
                      collapsed={sidePanel.collapsed}
                      onHasContent={sidePanel.setHasContent}
                    />
                  </div>
                </div>
              </ClipWidth>
            </div>
          </IntersectionProvider>
        </div>
      </SidePanelProvider>

      <DashboardBottomBar />
      <MobileNav />
      <GitHubAccessDialog />
      <CommandPalette />
    </div>
  );
}
