import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Building2, KeyRound, Mail, UserRound } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

const SETTINGS_NAV = [
  {
    id: "profile",
    label: "Profile",
    description: "Public name and profile",
    to: "/dashboard/settings/profile" as const,
    icon: UserRound
  },
  {
    id: "account",
    label: "Account",
    description: "Security and sessions",
    to: "/dashboard/settings/account" as const,
    icon: KeyRound
  },
  {
    id: "invites",
    label: "Invites",
    description: "Registration codes",
    to: "/dashboard/settings/invites" as const,
    icon: Mail
  },
  {
    id: "domain",
    label: "Domain",
    description: "Custom hostnames",
    to: "/dashboard/settings/domain" as const,
    icon: Building2
  }
] as const;

export const SettingsLayout = () => {
  const activeId = useLocation({
    select: (location) => {
      const last = location.pathname.split("/").at(-1);
      return last === "settings" || !last ? "profile" : last;
    }
  });

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        description="Manage your account settings and set e-mail preferences."
      />

      <SurfaceIslandLayout
        island={
          <nav aria-label="Settings sections" className="flex flex-col gap-0.5 p-2">
            {SETTINGS_NAV.map((item) => {
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
