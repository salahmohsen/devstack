"use client";

import { useLocation } from "@tanstack/react-router";
import { PanelLeftIcon } from "lucide-react";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Sheet, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";

import { DashboardSidebar } from "@/widgets/layout/ui/sidebar";

type DashboardMobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isDashboard: boolean;
};

const DashboardMobileNavContext = createContext<DashboardMobileNavContextValue | null>(null);

function useDashboardMobileNav() {
  const ctx = useContext(DashboardMobileNavContext);
  if (!ctx) {
    throw new Error("useDashboardMobileNav must be used within DashboardMobileNavProvider");
  }
  return ctx;
}

/**
 * Owns mobile dashboard nav sheet state. Mount around Topbar + main shell.
 * Desktop (`xl+`) keeps the in-flow sidebar; below that a left Sheet opens
 * from the topbar hamburger (before the logo).
 *
 * Open state is tied to the current pathname so navigation auto-closes
 * without an effect.
 */
export function DashboardMobileNavProvider({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const isDashboard = pathname.startsWith("/dashboard");
  /** When equal to `pathname`, the sheet is open; navigation clears it. */
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = isDashboard && openForPath === pathname;

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenForPath(next ? pathname : null);
    },
    [pathname]
  );

  const value = useMemo(() => {
    return {
      open,
      setOpen,
      isDashboard
    };
  }, [open, setOpen, isDashboard]);

  return (
    <DashboardMobileNavContext.Provider value={value}>
      {children}
      {isDashboard ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetPopup
            side="left"
            showCloseButton
            className="w-[min(100%,11.5rem)] max-w-46 p-0 sm:max-w-46"
          >
            <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
            <div className="flex h-full min-h-0 flex-col pt-10">
              <Suspense
                fallback={
                  <p className="px-3 py-2 text-sm text-muted-foreground">Loading navigation…</p>
                }
              >
                <DashboardSidebar resizable={false} />
              </Suspense>
            </div>
          </SheetPopup>
        </Sheet>
      ) : null}
    </DashboardMobileNavContext.Provider>
  );
}

/** Hamburger before the logo — dashboard routes only, hidden from xl up. */
export function DashboardMobileNavTrigger() {
  const { setOpen, isDashboard } = useDashboardMobileNav();
  const openMenu = useCallback(() => setOpen(true), [setOpen]);

  if (!isDashboard) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 xl:hidden"
      aria-label="Open dashboard menu"
      onClick={openMenu}
    >
      <PanelLeftIcon className="size-4" aria-hidden />
    </Button>
  );
}
