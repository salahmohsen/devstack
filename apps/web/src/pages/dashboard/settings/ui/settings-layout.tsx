import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Filter,
  Inbox,
  KeyRound,
  Link2,
  Mail,
  Sparkles,
  UserRound
} from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

type NavItem = {
  id: string;
  label: string;
  description: string;
  to:
    | "/dashboard/settings/profile"
    | "/dashboard/settings/account"
    | "/dashboard/settings/domain"
    | "/dashboard/settings/mail"
    | "/dashboard/settings/connections"
    | "/dashboard/settings/rules"
    | "/dashboard/settings/ai"
    | "/dashboard/settings/notifications"
    | "/dashboard/settings/invites";
  icon: typeof UserRound;
  group: "You" | "Workspace" | "Intelligence";
};

/** Order: identity/hosting first, integrations, intelligence, admin (modern settings IA). */
const SETTINGS_NAV: readonly NavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Public identity, contacts, and portfolio path",
    to: "/dashboard/settings/profile",
    icon: UserRound,
    group: "You"
  },
  {
    id: "account",
    label: "Account",
    description: "Sessions and sign-in security",
    to: "/dashboard/settings/account",
    icon: KeyRound,
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
    id: "mail",
    label: "Mail",
    description: "BYO Resend for Career Inbox inbound",
    to: "/dashboard/settings/mail",
    icon: Inbox,
    group: "Workspace"
  },
  {
    id: "connections",
    label: "Connections",
    description: "Google, Gmail, and GitHub links",
    to: "/dashboard/settings/connections",
    icon: Link2,
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
    id: "ai",
    label: "AI",
    description: "Providers, models, and mail reply autonomy",
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
  },
  {
    id: "invites",
    label: "Invites",
    description: "One-time signup codes",
    to: "/dashboard/settings/invites",
    icon: Mail,
    group: "Workspace"
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
    <PageLayout>
      <PageHeader title="Settings" description={activeNav.description} />

      <SurfaceIslandLayout
        island={
          <nav aria-label="Settings sections" className="flex flex-col gap-3 p-2">
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
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.description}
                          </span>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1 md:px-2">
          <Outlet />
        </div>
      </SurfaceIslandLayout>
    </PageLayout>
  );
};
