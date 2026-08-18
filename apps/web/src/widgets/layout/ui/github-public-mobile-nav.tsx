"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useRouter, useRouterState } from "@tanstack/react-router";
import { Archive, Bell, LayoutDashboard, LogOut, Settings, UserCircle } from "lucide-react";
import { useMemo } from "react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { IconRotate } from "@tsu-stack/ui/components/icon-motion";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { Dock, DockItem, DockSeparator } from "@tsu-stack/ui/components/motion/dock";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMobileDockHidden } from "@/shared/lib/mobile-dock-visibility";
import { isCustomDomainHost, primaryAppUrl } from "@/shared/lib/primary-app-url";
import {
  publicPortfolioHomeLocation,
  publicReposListLocation,
  usePublicSurface
} from "@/shared/lib/public-surface";
import { getRequestHostname } from "@/shared/lib/request-host";
import { resolvePublicScopeNav } from "@/shared/lib/resolve-public-scope-nav";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";
import { PrimaryAppMenuLink } from "@/shared/ui/primary-app-menu-link";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";
import { getGithubSetupStatusQueryOptions } from "@/features/github";

/**
 * Floating mobile dock: Profile · Repos · Dashboard · Account.
 * Replaces the old full-width bottom bar so content gains vertical space.
 */
export function MobileNav() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { username?: string };
  const sessionUsername = sessionUsernameFromUser(user) ?? undefined;
  const ownSurface = usePublicSurface(sessionUsername ?? "");

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

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        credentials: "include"
      }
    });
    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
    await queryClient.invalidateQueries({
      queryKey: getGithubSetupStatusQueryOptions(sessionUsername).queryKey
    });
    await router.invalidate();
    await navigate({ to: "/" });
  };

  const displayName = user?.name ?? user?.email ?? "Account";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profile = sessionUsername
    ? publicPortfolioHomeLocation(nav.surface ?? ownSurface)
    : ({ to: "/sign-in" as const } as const);
  const repos = sessionUsername
    ? publicReposListLocation(nav.surface ?? ownSurface)
    : ({ to: "/repos" as const } as const);

  const profileActive = nav.active === "profile";
  const reposActive = nav.active === "repos";
  const dashboardActive = nav.active === "dashboard" || pathname.startsWith("/dashboard");
  const dockHidden = useMobileDockHidden();

  if (dockHidden) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      )}
    >
      <Dock size={48} className="pointer-events-auto">
        <DockItem active={profileActive} aria-label="Profile">
          <Link
            to={profile.to}
            params={"params" in profile ? profile.params : undefined}
            preload={false}
            className="flex size-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Profile"
          >
            <UserCircle size={22} strokeWidth={1.8} aria-hidden />
          </Link>
        </DockItem>

        <DockItem active={reposActive} aria-label="Repositories">
          <Link
            to={repos.to}
            params={"params" in repos ? repos.params : undefined}
            preload={false}
            className="flex size-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Repositories"
          >
            <Archive size={22} strokeWidth={1.8} aria-hidden />
          </Link>
        </DockItem>

        <DockItem active={dashboardActive} aria-label="Dashboard">
          {customHost ? (
            <a
              href={primaryAppUrl("/dashboard")}
              className="flex size-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dashboard"
            >
              <LayoutDashboard size={22} strokeWidth={1.8} aria-hidden />
            </a>
          ) : (
            <Link
              to="/dashboard"
              preload={false}
              className="flex size-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dashboard"
            >
              <LayoutDashboard size={22} strokeWidth={1.8} aria-hidden />
            </Link>
          )}
        </DockItem>

        <DockSeparator />

        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                aria-label="Open account menu"
                className="relative flex size-12 shrink-0 items-center justify-center rounded-full transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
              />
            }
          >
            <Avatar className="size-7 border border-border">
              <AvatarImage alt={displayName} src={user?.image ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          </MenuTrigger>
          <MenuPopup align="center" side="top" className="w-56">
            <MenuGroup>
              <MenuGroupLabel className="flex items-center gap-3 py-2">
                <Avatar className="size-8 border border-border">
                  <AvatarImage alt={displayName} src={user?.image ?? undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  {user?.email ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  ) : null}
                </div>
              </MenuGroupLabel>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <PrimaryAppMenuLink path="/dashboard/settings/profile" label="Settings">
                <IconRotate mode="hover">
                  <Settings className="size-4" />
                </IconRotate>
                Settings
              </PrimaryAppMenuLink>
              <PrimaryAppMenuLink path="/dashboard/settings/notifications" label="Notifications">
                <Bell className="size-4" />
                Notifications
              </PrimaryAppMenuLink>
            </MenuGroup>
            {user ? (
              <>
                <MenuSeparator />
                <MenuGroup>
                  <MenuItem
                    nativeButton
                    closeOnClick
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </MenuItem>
                </MenuGroup>
              </>
            ) : (
              <>
                <MenuSeparator />
                <MenuGroup>
                  <MenuLinkItem render={<Link to="/sign-in" />}>
                    <UserCircle className="size-4" />
                    Sign in
                  </MenuLinkItem>
                </MenuGroup>
              </>
            )}
          </MenuPopup>
        </Menu>
      </Dock>
    </div>
  );
}
