import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { KeyRound, Link2, Users } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

type NavItem = {
  id: string;
  label: string;
  description: string;
  to: "/dashboard/admin/users" | "/dashboard/admin/invites" | "/dashboard/admin/access";
  icon: typeof Users;
};

const ADMIN_NAV: readonly NavItem[] = [
  {
    id: "users",
    label: "Users",
    description: "Everyone on this install",
    to: "/dashboard/admin/users",
    icon: Users
  },
  {
    id: "invites",
    label: "Invites",
    description: "Named links and emailed codes",
    to: "/dashboard/admin/invites",
    icon: Link2
  },
  {
    id: "access",
    label: "Access",
    description: "Open registration or invite-only",
    to: "/dashboard/admin/access",
    icon: KeyRound
  }
] as const;

export const AdminLayout = () => {
  const activeId = useLocation({
    select: (location) => {
      const last = location.pathname.split("/").at(-1);
      return last === "admin" || !last ? "users" : last;
    }
  });

  const activeNav = ADMIN_NAV.find((item) => item.id === activeId) ?? ADMIN_NAV[0]!;

  return (
    <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-5 overflow-hidden p-5">
      <PageHeader title="Admin" description={activeNav.description} />

      <SurfaceIslandLayout
        className="min-h-0 flex-1 overflow-hidden"
        islandClassName="max-h-48 min-h-0 md:max-h-none"
        island={
          <nav
            aria-label="Admin sections"
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
          >
            {ADMIN_NAV.map((item) => {
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                </Link>
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
