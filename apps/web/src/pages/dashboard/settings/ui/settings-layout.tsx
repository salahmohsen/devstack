import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Building2,
  Filter,
  Keyboard,
  KeyRound,
  Blocks,
  Sparkles,
  UserRound
} from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

type NavItem = {
  id: string;
  label: string;
  /** Short page-header blurb only — not shown in the sidebar. */
  description: string;
  to:
    | "/dashboard/settings/profile"
    | "/dashboard/settings/account"
    | "/dashboard/settings/domain"
    | "/dashboard/settings/connections"
    | "/dashboard/settings/rules"
    | "/dashboard/settings/jobs"
    | "/dashboard/settings/ai"
    | "/dashboard/settings/notifications"
    | "/dashboard/settings/shortcuts";
  icon: typeof UserRound;
  group: "You" | "Workspace" | "Intelligence";
};

/** Order: identity/hosting first, integrations, intelligence, admin (modern settings IA). */
const SETTINGS_NAV: readonly NavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Public identity and contacts",
    to: "/dashboard/settings/profile",
    icon: UserRound,
    group: "You"
  },
  {
    id: "account",
    label: "Account",
    description: "Username, sessions, and sign-in security",
    to: "/dashboard/settings/account",
    icon: KeyRound,
    group: "You"
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    description: "Keyboard shortcuts you can customize",
    to: "/dashboard/settings/shortcuts",
    icon: Keyboard,
    group: "You"
  },
  {
    id: "domain",
    label: "Domain",
    description: "Custom hostname for your portfolio",
    to: "/dashboard/settings/domain",
    icon: Building2,
    group: "Workspace"
  },
  {
    id: "connections",
    label: "Integrations",
    description: "Gmail, GitHub, and Resend inbound",
    to: "/dashboard/settings/connections",
    icon: Blocks,
    group: "Workspace"
  },
  {
    id: "rules",
    label: "Rules",
    description: "Smart mail categories and keywords",
    to: "/dashboard/settings/rules",
    icon: Filter,
    group: "Workspace"
  },
  {
    id: "jobs",
    label: "Jobs",
    description: "Find and rank jobs from public boards",
    to: "/dashboard/settings/jobs",
    icon: Briefcase,
    group: "Intelligence"
  },
  {
    id: "ai",
    label: "AI",
    description: "Providers, models, and AI features",
    to: "/dashboard/settings/ai",
    icon: Sparkles,
    group: "Intelligence"
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alert destinations and channels",
    to: "/dashboard/settings/notifications",
    icon: Bell,
    group: "Intelligence"
  }
] as const;

const NAV_GROUPS = ["You", "Workspace", "Intelligence"] as const;

export const SettingsLayout = () => {
  const activeId = useLocation({
    select: (location) => {
      const last = location.pathname.split("/").at(-1);
      return last === "settings" || !last ? "profile" : last;
    }
  });

  const activeNav = SETTINGS_NAV.find((item) => item.id === activeId) ?? SETTINGS_NAV[0]!;

  return (
    <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-5 overflow-hidden p-5">
      <PageHeader title="Settings" description={activeNav.description} />

      <SurfaceIslandLayout
        className="min-h-0 flex-1 overflow-hidden"
        islandClassName="max-h-48 min-h-0 md:max-h-none"
        island={
          <nav
            aria-label="Settings sections"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2"
          >
            {NAV_GROUPS.map((group) => {
              const items = SETTINGS_NAV.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="flex flex-col gap-0.5">
                  <p className="px-2.5 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = activeId === item.id;
                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        data-cuelume-hover="tick"
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        }
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </SurfaceIslandLayout>
    </PageLayout>
  );
};
