import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import {
  Archive,
  Bell,
  LayoutDashboard,
  LogOut,
  SearchIcon,
  Settings,
  UserCircle
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Button } from "@tsu-stack/ui/components/button";
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
import { TextAnimate } from "@tsu-stack/ui/components/text-animate";
import { ThemeSwitcher } from "@tsu-stack/ui/components/theme-switcher";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { setCommandPaletteOpen } from "@/shared/lib/command-palette/open-state";
import {
  registerCommandHandler,
  setCommandEnabled,
  useCommandBinding,
  type CommandId
} from "@/shared/lib/commands";
import { isCustomDomainHost, primaryAppUrl } from "@/shared/lib/primary-app-url";
import {
  publicPortfolioHomeLocation,
  publicReposListLocation,
  usePublicSurface
} from "@/shared/lib/public-surface";
import { parseRepoTabLocation } from "@/shared/lib/repo-paths";
import { getRequestHostname } from "@/shared/lib/request-host";
import { resolvePublicScopeNav } from "@/shared/lib/resolve-public-scope-nav";
import { preloadRouteOnce } from "@/shared/lib/route-preload";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";
import { removeTab, useTabs } from "@/shared/lib/tab-store";
import { useMediaQuery } from "@/shared/lib/use-media-query";
import { HotkeyKbd } from "@/shared/ui/hotkey-kbd";
import { PrimaryAppMenuLink } from "@/shared/ui/primary-app-menu-link";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";
import { getGithubSetupStatusQueryOptions } from "@/features/github";

import { DashboardMobileNavTrigger } from "@/widgets/layout/ui/dashboard-mobile-nav";
import { Tabs } from "@/widgets/layout/ui/github-public-tabs";
import { NotificationsBell } from "@/widgets/layout/ui/notifications-bell";
import { PublicScopeNav } from "@/widgets/layout/ui/public-scope-nav";
import { SoundMuteButton } from "@/widgets/layout/ui/sound-mute-button";

const TAB_SELECT_COMMANDS = [
  "tabs.select-1",
  "tabs.select-2",
  "tabs.select-3",
  "tabs.select-4",
  "tabs.select-5",
  "tabs.select-6",
  "tabs.select-7",
  "tabs.select-8",
  "tabs.select-9"
] as const satisfies readonly CommandId[];

export function Topbar() {
  const router = useRouter();
  const rawNavigate = useNavigate();
  const navigateRef = useRef(rawNavigate);
  const pathname = useLocation({
    select: (location) => location.pathname
  });

  useEffect(() => {
    navigateRef.current = rawNavigate;
  }, [rawNavigate]);
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const queryClient = useQueryClient();
  // Non-suspense: Topbar must paint even while auth is resolving (suspense hid the
  // whole nav chrome on some navigations and made the avatar look "missing").
  const { user: admin, isPending: authPending } = useAuth();
  const isClient = useIsClient();
  /** Below `md` — Profile / Repos / Dashboard move into the account menu. */
  const isMobile = useMediaQuery("(max-width: 767px)");
  const openTabs = useTabs();
  const params = useParams({ strict: false }) as { username?: string };

  // Prefer session user's profile for GitHub chrome; never a global site owner.
  const sessionUsername = sessionUsernameFromUser(admin) ?? undefined;
  const ownSurface = usePublicSurface(sessionUsername ?? "");
  const hostname = getRequestHostname();
  const customHost = isCustomDomainHost(hostname);
  const customDomainQuery = useQuery({
    ...getResolvePublicPortfolioQueryOptions({ host: hostname ?? undefined }),
    enabled: customHost
  });
  const scopeNav = useMemo(
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
  const setupStatus = sessionUsername
    ? queryClient.getQueryData(getGithubSetupStatusQueryOptions(sessionUsername).queryKey)
    : undefined;
  const owner = setupStatus?.owner ?? null;
  const profileLocation = publicPortfolioHomeLocation(scopeNav.surface ?? ownSurface);
  const reposLocation = publicReposListLocation(scopeNav.surface ?? ownSurface);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        credentials: "include"
      }
    });
    // Drop cached session immediately (query staleTime is 5m; suspense keeps UI mounted).
    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
    await queryClient.invalidateQueries({
      queryKey: getGithubSetupStatusQueryOptions(sessionUsername).queryKey
    });
    await router.invalidate();
    await navigateRef.current({ to: "/" });
  };

  const displayName = admin?.name ?? admin?.email ?? "Guest";
  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [displayName]
  );

  // const navItems = useMemo<NavItem[]>(
  //   () => [
  //     { to: "/", label: "Overview", icon: Home },
  //     {
  //       to: "/repos",
  //       label: "Repositories",
  //       icon: Archive
  //     },
  //     { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
  //   ],
  //   []
  // );

  useEffect(() => {
    // Public `/` and `/repos` loaders fetch portfolio + GitHub. Do not run
    // those on dashboard chrome — they are unused and delay every page.
    if (pathname.startsWith("/dashboard")) return;
    let cancelled = false;
    void (async () => {
      const routes = ["/", "/repos", "/dashboard"];
      await Promise.all(
        routes.map((to) => preloadRouteOnce(routerRef.current, to).catch(() => undefined))
      );
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function navigateToTab(tab: { url: string } | undefined) {
    if (!tab) return;
    const location = parseRepoTabLocation(tab.url);
    if (location) {
      void routerRef.current.navigate({
        to: location.to,
        params: location.params
      } as never);
      return;
    }
    void routerRef.current.navigate({ to: tab.url as never });
  }

  const paletteToggleBinding = useCommandBinding("palette.toggle");

  useEffect(() => {
    const unsubs = [
      registerCommandHandler("tabs.close", () => {
        const currentPath = routerRef.current.state.location.pathname;
        const currentTab = openTabs.find((tab) => tab.url === currentPath);
        if (!currentTab) return;
        const index = openTabs.findIndex((item) => item.id === currentTab.id);
        const nextTab = index === -1 ? undefined : (openTabs[index + 1] ?? openTabs[index - 1]);
        removeTab(currentTab.id);
        void routerRef.current.navigate({ to: nextTab?.url ?? ("/" as never) });
      }),
      registerCommandHandler("tabs.prev", () => {
        const currentIndex = openTabs.findIndex(
          (tab) => tab.url === routerRef.current.state.location.pathname
        );
        const nextIndex =
          currentIndex === -1
            ? openTabs.length - 1
            : (currentIndex - 1 + openTabs.length) % openTabs.length;
        navigateToTab(openTabs[nextIndex]);
      }),
      registerCommandHandler("tabs.next", () => {
        const currentIndex = openTabs.findIndex(
          (tab) => tab.url === routerRef.current.state.location.pathname
        );
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % openTabs.length;
        navigateToTab(openTabs[nextIndex]);
      }),
      ...TAB_SELECT_COMMANDS.map((id, index) =>
        registerCommandHandler(id, () => {
          navigateToTab(openTabs[index]);
        })
      )
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [openTabs]);

  useEffect(() => {
    setCommandEnabled("tabs.close", openTabs.length > 0);
    setCommandEnabled("tabs.prev", openTabs.length > 1);
    setCommandEnabled("tabs.next", openTabs.length > 1);
    for (const [index, id] of TAB_SELECT_COMMANDS.entries()) {
      setCommandEnabled(id, openTabs.length > index);
    }
    return () => {
      setCommandEnabled("tabs.close", false);
      setCommandEnabled("tabs.prev", false);
      setCommandEnabled("tabs.next", false);
      for (const id of TAB_SELECT_COMMANDS) {
        setCommandEnabled(id, false);
      }
    };
  }, [openTabs.length]);

  const accountControl = admin ? (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open account menu"
            className="size-8 shrink-0 rounded-full p-0"
          />
        }
      >
        <Avatar className="size-7 border border-border">
          <AvatarImage src={admin.image ?? undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </MenuTrigger>
      <MenuPopup align="end" className="w-56">
        <MenuGroup>
          <MenuGroupLabel className="flex items-center gap-3 py-2">
            <Avatar className="size-8 border border-border">
              <AvatarImage src={admin.image ?? undefined} alt={displayName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
              {owner ? (
                <span className="truncate text-xs font-normal text-muted-foreground">@{owner}</span>
              ) : null}
            </div>
          </MenuGroupLabel>
        </MenuGroup>
        <MenuSeparator />
        {/* Mobile-only: Profile / Repos / Dashboard live here (desktop uses PublicScopeNav). */}
        {isMobile && sessionUsername ? (
          <>
            <MenuGroup>
              <MenuLinkItem
                render={
                  <Link
                    to={profileLocation.to}
                    params={"params" in profileLocation ? profileLocation.params : undefined}
                  />
                }
              >
                <UserCircle size={16} strokeWidth={2} />
                Profile
              </MenuLinkItem>
              <MenuLinkItem
                render={
                  <Link
                    to={reposLocation.to}
                    params={"params" in reposLocation ? reposLocation.params : undefined}
                  />
                }
              >
                <Archive size={16} strokeWidth={2} />
                Repos
              </MenuLinkItem>
              {scopeNav.showDashboard ? (
                customHost ? (
                  <MenuLinkItem render={<a href={primaryAppUrl("/dashboard")} />}>
                    <LayoutDashboard size={16} strokeWidth={2} />
                    Dashboard
                  </MenuLinkItem>
                ) : (
                  <PrimaryAppMenuLink path="/dashboard" label="Dashboard">
                    <LayoutDashboard size={16} strokeWidth={2} />
                    Dashboard
                  </PrimaryAppMenuLink>
                )
              ) : null}
            </MenuGroup>
            <MenuSeparator />
          </>
        ) : null}
        <MenuGroup>
          <PrimaryAppMenuLink path="/dashboard/settings/profile" label="Settings">
            <IconRotate mode="hover">
              <Settings size={16} strokeWidth={2} />
            </IconRotate>
            Settings
          </PrimaryAppMenuLink>
          <PrimaryAppMenuLink path="/dashboard/settings/notifications" label="Notifications">
            <Bell size={16} strokeWidth={2} />
            Notifications
          </PrimaryAppMenuLink>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem
            nativeButton
            closeOnClick
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  ) : authPending ? (
    <div
      aria-hidden
      className="size-8 shrink-0 animate-pulse rounded-full border border-border bg-muted"
    />
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0"
      render={<Link to="/sign-in" />}
      aria-label="Sign in"
    >
      <UserCircle size={16} strokeWidth={2} />
      <span className="hidden sm:inline">Sign in</span>
    </Button>
  );

  return (
    <nav className="flex min-h-(--navbar-height) min-w-0 shrink-0 items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] md:h-(--navbar-height) md:pt-2">
      <DashboardMobileNavTrigger />
      <Link
        to="/"
        className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Home"
        title="Home"
      >
        <TextAnimate animation="slideLeft" by="character">
          DEVSTACK
        </TextAnimate>
      </Link>

      <PublicScopeNav />

      <div className="min-w-0 flex-1 overflow-hidden">
        <Tabs tabsReady={isClient} routerRef={routerRef} />
      </div>

      {/* Find → signal → prefs → identity. Avatar stays in the topbar on all sizes. */}
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          className="hidden md:inline-flex"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <SearchIcon />
          <HotkeyKbd binding={paletteToggleBinding} className="ms-0" />
        </Button>

        {admin && pathname.includes("dashboard") ? (
          <div className="hidden md:block">
            <NotificationsBell />
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <ThemeSwitcher variant="ghost" className="size-8" />
          <SoundMuteButton />
        </div>

        {accountControl}
      </div>
    </nav>
  );
}
