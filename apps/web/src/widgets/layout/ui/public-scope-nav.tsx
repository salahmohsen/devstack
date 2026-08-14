"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouterState } from "@tanstack/react-router";
import { Archive, LayoutDashboard, UserCircle } from "lucide-react";
import { useMemo } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { cn } from "@tsu-stack/ui/lib/utils";

import { isCustomDomainHost, primaryAppUrl } from "@/shared/lib/primary-app-url";
import { publicPortfolioHomeLocation, publicReposListLocation } from "@/shared/lib/public-surface";
import { getRequestHostname } from "@/shared/lib/request-host";
import { resolvePublicScopeNav } from "@/shared/lib/resolve-public-scope-nav";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";

import { MorphNavItem } from "@/widgets/layout/ui/morph-nav-item";

/**
 * Profile / Repositories / Dashboard product nav for public + dashboard chrome.
 * Dashboard chip only when authenticated; always absolute primary-app URL on custom domains.
 * @see docs/superpowers/specs/2026-08-09-public-profile-repos-topbar-tabs-design.md
 */
export function PublicScopeNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { username?: string };
  const { user } = useAuth();
  const sessionUsername = sessionUsernameFromUser(user);

  // Isomorphic host (SSR request Host + client window) so custom-domain resolve
  // can run on first paint, not only after hydration.
  const hostname = getRequestHostname();
  const customHost = isCustomDomainHost(hostname);

  const customDomainQuery = useQuery({
    ...getResolvePublicPortfolioQueryOptions({ host: hostname ?? undefined }),
    enabled: customHost
  });

  const nav = useMemo(
    () =>
      resolvePublicScopeNav({
        pathname,
        hostname,
        pathUsername: params.username,
        customDomainUsername: customDomainQuery.data?.username ?? null,
        sessionUsername
      }),
    [pathname, hostname, params.username, customDomainQuery.data?.username, sessionUsername]
  );

  if (!nav.show || !nav.surface) return null;

  const home = publicPortfolioHomeLocation(nav.surface);
  const repos = publicReposListLocation(nav.surface);

  return (
    <nav
      aria-label="Portfolio"
      className={cn("flex h-8 shrink-0 items-center rounded-lg bg-muted/80 p-0.5", className)}
    >
      <ul className="flex min-h-7 items-center gap-0.5">
        <MorphNavItem
          to={home.to}
          params={"params" in home ? home.params : undefined}
          active={nav.active === "profile"}
          label="Profile"
        >
          <UserCircle className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden md:inline">Profile</span>
        </MorphNavItem>
        <MorphNavItem
          to={repos.to}
          params={"params" in repos ? repos.params : undefined}
          active={nav.active === "repos"}
          label="Repositories"
        >
          <Archive className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden md:inline">Repos</span>
        </MorphNavItem>
        {nav.showDashboard ? (
          customHost ? (
            <MorphNavItem
              href={primaryAppUrl("/dashboard")}
              active={nav.active === "dashboard"}
              label="Dashboard"
            >
              <DashboardLabel />
            </MorphNavItem>
          ) : (
            <MorphNavItem to="/dashboard" active={nav.active === "dashboard"} label="Dashboard">
              <DashboardLabel />
            </MorphNavItem>
          )
        ) : null}
      </ul>
    </nav>
  );
}

function DashboardLabel() {
  return (
    <>
      <LayoutDashboard className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="hidden md:inline">Dashboard</span>
    </>
  );
}
