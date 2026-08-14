import { useLocation } from "@tanstack/react-router";
import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useState
} from "react";

import { ScrollArea } from "@tsu-stack/ui/components/scroll-area.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";
import { IntersectionProvider } from "@/shared/providers/intersection.provider";

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

/**
 * Panel open/close without Motion `layout` or `animate={{ width }}`.
 *
 * Why not Motion `layout` on the main column?
 * Layout size projection uses scale transforms. That stretches every dashboard
 * card/text for the duration of the spring → visible flicker (Motion docs:
 * children distort unless every descendant also has `layout`).
 *
 * Why not `animate={{ width }}`?
 * React Doctor flags it (layout thrash). A CSS width transition on the panel
 * shell gives the same flex reflow for the main Card without scale projection
 * and without that rule.
 *
 * Ease approximates the previous spring (stiffness 320 / damping 36).
 */
const PANEL_WIDTH_TRANSITION = "width 420ms cubic-bezier(0.32, 0.72, 0, 1)" as const;

/**
 * Left nav enter: start at width 0 so the main Card is full-bleed, then
 * expand to the nav width. Same CSS width transition as the right side panel
 * (no Motion `layout` / `animate={{ width }}` — those scale-distort children).
 */
function DashboardNavShell({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setWidth(DASHBOARD_NAV_DEFAULT_WIDTH);
    });
    const timeout = window.setTimeout(() => setUnlocked(true), 420);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      data-dashboard-nav-shell
      className="hidden h-full min-h-0 shrink-0 overflow-hidden xl:block"
      style={{
        width: unlocked ? undefined : width,
        transition: unlocked ? undefined : PANEL_WIDTH_TRANSITION
      }}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== "width") return;
        if (width > 0) setUnlocked(true);
      }}
    >
      <div className="h-full" style={unlocked ? undefined : { width: DASHBOARD_NAV_DEFAULT_WIDTH }}>
        {children}
      </div>
    </div>
  );
}

export function RootLayout({ children }: PropsWithChildren) {
  const sidePanel = useSidePanelSlot();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const showPanel = isXl && sidePanel.hasContent && !sidePanel.collapsed;
  const isDashboard = useLocation().pathname.startsWith("/dashboard");
  const panelWidth = isDashboard ? DASHBOARD_SIDE_PANEL_WIDTH : PUBLIC_SIDE_PANEL_WIDTH;

  const panelShellStyle = {
    width: showPanel ? panelWidth : 0,
    transition: PANEL_WIDTH_TRANSITION
  } satisfies CSSProperties;

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
          toggle: sidePanel.toggle
        }}
      >
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden p-2 pt-0">
          <IntersectionProvider>
            {isDashboard ? (
              <DashboardNavShell>
                <PublicSidebar />
              </DashboardNavShell>
            ) : null}
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
                <main className="relative flex min-h-0 w-full flex-1 overflow-hidden bg-background">
                  <ScrollArea scrollFade fill clampContentMinWidth={true}>
                    {children}
                  </ScrollArea>
                </main>
                <SidePanelToggle />
              </div>

              <div
                data-side-panel-shell
                style={panelShellStyle}
                className="hidden h-full min-h-0 shrink-0 overflow-hidden xl:flex"
              >
                <div className="flex h-full min-h-0" style={{ width: panelWidth }}>
                  <div aria-hidden className="w-px shrink-0 self-stretch bg-border" />
                  <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                    <SidePanelSlot
                      slotRef={sidePanel.setNode}
                      collapsed={sidePanel.collapsed}
                      onHasContent={sidePanel.setHasContent}
                    />
                  </div>
                </div>
              </div>
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
