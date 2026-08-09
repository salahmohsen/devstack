"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { Archive, UserCircle } from "lucide-react";
import { useMemo } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { cn } from "@tsu-stack/ui/lib/utils";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { publicPortfolioHomeLocation, publicReposListLocation } from "@/shared/lib/public-surface";
import { getRequestHostname } from "@/shared/lib/request-host";
import { resolvePublicScopeNav } from "@/shared/lib/resolve-public-scope-nav";
import { sessionProfileNameFromUser } from "@/shared/lib/session-profile-name";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";

/**
 * Profile / Repositories product nav for public portfolio chrome.
 * @see docs/superpowers/specs/2026-08-09-public-profile-repos-topbar-tabs-design.md
 */
export function PublicScopeNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { profileName?: string };
  const { user } = useAuth();
  const sessionProfileName = sessionProfileNameFromUser(user);

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
        pathProfileName: params.profileName,
        customDomainProfileName: customDomainQuery.data?.profileName ?? null,
        sessionProfileName
      }),
    [
      pathname,
      hostname,
      params.profileName,
      customDomainQuery.data?.profileName,
      sessionProfileName
    ]
  );

  if (!nav.show || !nav.surface) return null;

  const home = publicPortfolioHomeLocation(nav.surface);
  const repos = publicReposListLocation(nav.surface);

  return (
    <nav
      aria-label="Portfolio"
      className={cn(
        "flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-muted/80 p-0.5",
        className
      )}
    >
      <ScopeNavLink
        to={home.to}
        params={"params" in home ? home.params : undefined}
        active={nav.active === "profile"}
        label="Profile"
        icon={UserCircle}
      />
      <ScopeNavLink
        to={repos.to}
        params={"params" in repos ? repos.params : undefined}
        active={nav.active === "repos"}
        label="Repositories"
        icon={Archive}
      />
    </nav>
  );
}

function ScopeNavLink({
  to,
  params,
  active,
  label,
  icon: Icon
}: {
  to: string;
  params?: Record<string, string>;
  active: boolean;
  label: string;
  icon: typeof UserCircle;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
        "text-muted-foreground hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "bg-background text-foreground shadow-sm/5 dark:bg-input"
      )}
    >
      <Icon size={15} strokeWidth={2} className="shrink-0" aria-hidden />
      <span className="hidden md:inline">{label === "Repositories" ? "Repos" : label}</span>
    </Link>
  );
}
