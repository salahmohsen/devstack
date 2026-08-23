import { useLocation } from "@tanstack/react-router";

import { useAuthSuspense } from "@tsu-stack/auth/react";
import { authClient } from "@tsu-stack/auth/react/auth-client";
import { isSuperAdminRole } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Header,
  Sidebar001Item,
  Sidebar001Section
} from "@tsu-stack/ui/components/unlumen-ui/sidebar-001";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useCountApplicationsQuery } from "@/features/applications";

/**
 * Dashboard-only nav. Product home lives on the brand + account menu;
 * Profile / Repos / Dashboard live in the topbar scope cluster.
 */
const DashboardItems = [
  { href: "/dashboard", label: "Agent" },
  { href: "/dashboard/onboarding", label: "Onboarding" },
  { href: "/dashboard/experiences", label: "Experiences" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/skills", label: "Skills" },
  { href: "/dashboard/resumes", label: "Resumes" },
  { href: "/dashboard/new-jobs", label: "New jobs" },
  { href: "/dashboard/tracked-jobs", label: "Tracked jobs" },
  {
    href: "/dashboard/mail/applications",
    label: "Mail",
    matchPrefix: "/dashboard/mail"
  },
  {
    href: "/dashboard/settings/profile",
    label: "Settings",
    /** Keep Settings active across profile/account/domain tabs. */
    matchPrefix: "/dashboard/settings"
  },
  {
    href: "/dashboard/admin/users",
    label: "Admin",
    matchPrefix: "/dashboard/admin"
  }
] as const;

/**
 * In-flow nav column width. Keep in sync with `Sidebar001` props below.
 * Sized so “Tracked jobs” + badge fit without horizontal clip.
 */
export const DASHBOARD_NAV_DEFAULT_WIDTH = 168;

type NavItem = { href: string; label: string; matchPrefix?: string };

type DashboardSidebarProps = {
  className?: string;
  /** Disable drag-resize (mobile sheet). Default true. */
  resizable?: boolean;
};

/** Left nav for `/dashboard/*` only (mounted via ClipWidth when on dashboard). */
export function DashboardSidebar({ className, resizable = true }: DashboardSidebarProps) {
  const pathname = useLocation().pathname;
  const { user } = useAuthSuspense();
  const { data: session } = authClient.useSession();
  const isSignedIn = !!user;
  const showAdmin = isSuperAdminRole(user?.role) && !session?.session?.impersonatedBy;

  const inboxCountQuery = useCountApplicationsQuery("inbox", {
    enabled: isSignedIn,
    refetchInterval: 60_000
  });
  const inboxCount = inboxCountQuery.data?.count ?? 0;
  const inboxBadgeLabel = inboxCount > 99 ? "99+" : String(inboxCount);

  if (!isSignedIn) return null;

  return (
    <Sidebar001
      defaultWidth={DASHBOARD_NAV_DEFAULT_WIDTH}
      minWidth={140}
      maxWidth={240}
      resizable={resizable}
      className={cn("h-full", className)}
    >
      {/*
        Title starts on the same edge as the item rail ticks (header/content px-1).
        pt-3 matches the main card’s top optical start beside the rounded shell.
      */}
      <Sidebar001Header className="pt-3 pb-1">
        <p className="m-0 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
          Dashboard
        </p>
      </Sidebar001Header>
      <Sidebar001Content className="pt-0 pb-3">
        <Sidebar001Section>
          {DashboardItems.map((item: NavItem) => {
            if (item.href === "/dashboard/admin/users" && !showAdmin) return null;
            const isNewJobs = item.href === "/dashboard/new-jobs";
            const showInboxBadge = isNewJobs && inboxCount > 0;
            return (
              <Sidebar001Item
                key={item.href}
                href={item.href}
                label={item.label}
                badge={
                  showInboxBadge ? (
                    <Badge size="sm" variant="brand" className="tabular-nums">
                      {inboxBadgeLabel}
                    </Badge>
                  ) : undefined
                }
                isActive={
                  item.matchPrefix
                    ? pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
                    : pathname === item.href || pathname === `${item.href}/`
                }
              />
            );
          })}
        </Sidebar001Section>
      </Sidebar001Content>
    </Sidebar001>
  );
}

/** @deprecated Use {@link DashboardSidebar} — sidebar is dashboard-only. */
export const PublicSidebar = DashboardSidebar;
