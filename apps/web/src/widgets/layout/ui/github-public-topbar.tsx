import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { Archive, LayoutDashboard, LogOut, SearchIcon, UserCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Button } from "@tsu-stack/ui/components/button";
import { Kbd, KbdGroup } from "@tsu-stack/ui/components/kbd";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { TextAnimate } from "@tsu-stack/ui/components/text-animate";
import { ThemeSwitcher } from "@tsu-stack/ui/components/theme-switcher";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { setCommandPaletteOpen } from "@/shared/lib/command-palette/open-state";
import { primaryAppUrl } from "@/shared/lib/primary-app-url";
import {
  publicPortfolioHomeLocation,
  publicReposListLocation,
  usePublicSurface
} from "@/shared/lib/public-surface";
import { parseRepoTabLocation } from "@/shared/lib/repo-paths";
import { preloadRouteOnce } from "@/shared/lib/route-preload";
import { sessionProfileNameFromUser } from "@/shared/lib/session-profile-name";
import { removeTab, useTabs } from "@/shared/lib/tab-store";
import { useGlobalShortcuts } from "@/shared/lib/use-global-shortcuts";
import { PrimaryAppMenuLink } from "@/shared/ui/primary-app-menu-link";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import { Tabs } from "@/widgets/layout/ui/github-public-tabs";
import { NotificationsBell } from "@/widgets/layout/ui/notifications-bell";
import { PublicScopeNav } from "@/widgets/layout/ui/public-scope-nav";

const MAX_TAB_SHORTCUTS = 9;

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
  const openTabs = useTabs();

  // Prefer session user's profile for GitHub chrome; never a global site owner.
  const sessionProfileName = sessionProfileNameFromUser(admin) ?? undefined;
  const ownSurface = usePublicSurface(sessionProfileName ?? "");
  const setupStatus = sessionProfileName
    ? queryClient.getQueryData(getGithubSetupStatusQueryOptions(sessionProfileName).queryKey)
    : undefined;
  const owner = setupStatus?.owner ?? null;

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          credentials: "include"
        }
      });
    } finally {
      // Drop cached session immediately (query staleTime is 5m; suspense keeps UI mounted).
      queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
      await queryClient.invalidateQueries({
        queryKey: getGithubSetupStatusQueryOptions(sessionProfileName).queryKey
      });
      await router.invalidate();
      await navigateRef.current({ to: "/" });
    }
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
    let cancelled = false;
    void (async () => {
      const routes = ["/", "/repos", "/dashboard"];
      for (const to of routes) {
        if (cancelled) break;
        try {
          await preloadRouteOnce(routerRef.current, to);
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function getNeighborTab(tab: { id: string; url: string } | undefined) {
    if (!tab) return undefined;
    const index = openTabs.findIndex((item) => item.id === tab.id);
    if (index === -1) return undefined;
    return openTabs[index + 1] ?? openTabs[index - 1];
  }

  useGlobalShortcuts([
    ...Array.from({ length: Math.min(openTabs.length, MAX_TAB_SHORTCUTS) }, (_, index) => {
      return {
        shortcut: { code: `Digit${index + 1}`, shift: true },
        enabled: openTabs.length > index,
        onTrigger: () => {
          navigateToTab(openTabs[index]);
        }
      };
    }),
    {
      shortcut: [{ key: "g" }, { key: "u" }],
      enabled: Boolean(sessionProfileName),
      onTrigger: () => {
        if (!sessionProfileName) return;
        // Host-aware: custom domain → `/`; path primary → `/$profileName`.
        const loc = publicPortfolioHomeLocation(ownSurface);
        void navigateRef.current(
          "params" in loc ? { to: loc.to, params: loc.params } : { to: loc.to }
        );
      }
    },
    {
      shortcut: [{ key: "g" }, { key: "o" }],
      enabled: Boolean(sessionProfileName),
      onTrigger: () => {
        if (!sessionProfileName) return;
        const loc = publicReposListLocation(ownSurface);
        void navigateRef.current(
          "params" in loc ? { to: loc.to, params: loc.params } : { to: loc.to }
        );
      }
    },
    {
      shortcut: [{ key: "g" }, { key: "d" }],
      enabled: Boolean(admin),
      onTrigger: () => {
        // Primary host only — dashboard is not served on custom portfolio domains.
        window.location.assign(primaryAppUrl("/dashboard"));
      }
    },
    {
      shortcut: { key: "w", shift: true },
      enabled: openTabs.length > 0,
      onTrigger: () => {
        const currentPath = routerRef.current.state.location.pathname;
        const currentTab = openTabs.find((tab) => tab.url === currentPath);
        if (!currentTab) return;
        const nextTab = getNeighborTab(currentTab);
        removeTab(currentTab.id);
        void routerRef.current.navigate({ to: nextTab?.url ?? ("/" as never) });
      }
    },
    {
      shortcut: { key: "ArrowLeft", shift: true },
      enabled: openTabs.length > 1,
      onTrigger: () => {
        const currentIndex = openTabs.findIndex(
          (tab) => tab.url === routerRef.current.state.location.pathname
        );
        const nextIndex =
          currentIndex === -1
            ? openTabs.length - 1
            : (currentIndex - 1 + openTabs.length) % openTabs.length;
        navigateToTab(openTabs[nextIndex]);
      }
    },
    {
      shortcut: { key: "ArrowRight", shift: true },
      enabled: openTabs.length > 1,
      onTrigger: () => {
        const currentIndex = openTabs.findIndex(
          (tab) => tab.url === routerRef.current.state.location.pathname
        );
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % openTabs.length;
        navigateToTab(openTabs[nextIndex]);
      }
    }
  ]);

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
        <MenuGroup>
          {sessionProfileName ? (
            <MenuLinkItem
              render={(() => {
                const loc = publicPortfolioHomeLocation(ownSurface);
                return "params" in loc ? (
                  <Link to={loc.to} params={loc.params} />
                ) : (
                  <Link to={loc.to} />
                );
              })()}
            >
              <UserCircle size={16} strokeWidth={2} />
              Profile
              <MenuShortcut>D U</MenuShortcut>
            </MenuLinkItem>
          ) : (
            <MenuItem disabled>
              <UserCircle size={16} strokeWidth={2} />
              Profile
              <MenuShortcut>D U</MenuShortcut>
            </MenuItem>
          )}
          {sessionProfileName ? (
            <MenuLinkItem
              render={(() => {
                const loc = publicReposListLocation(ownSurface);
                return "params" in loc ? (
                  <Link to={loc.to} params={loc.params} />
                ) : (
                  <Link to={loc.to} />
                );
              })()}
            >
              <Archive size={16} strokeWidth={2} />
              Repositories
              <MenuShortcut>D O</MenuShortcut>
            </MenuLinkItem>
          ) : (
            <MenuItem disabled>
              <Archive size={16} strokeWidth={2} />
              Repositories
              <MenuShortcut>D O</MenuShortcut>
            </MenuItem>
          )}
          <PrimaryAppMenuLink
            path="/dashboard"
            label="Dashboard"
            shortcut={<MenuShortcut>D D</MenuShortcut>}
          >
            <LayoutDashboard size={16} strokeWidth={2} />
            Dashboard
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
      <Link to="/" className="shrink-0">
        <TextAnimate animation="slideLeft" by="character">
          DEV-STACK
        </TextAnimate>
      </Link>

      <PublicScopeNav />

      <div className="min-w-0 flex-1 overflow-hidden">
        <Tabs tabsReady={isClient} routerRef={routerRef} />
      </div>

      {/* shrink-0 + no overflow here so avatar/actions never get clipped by tabs */}
      <div className="relative z-10 flex shrink-0 items-center gap-1">
        {/* Bell stays visible below md on dashboard. */}
        {admin && pathname.includes("dashboard") ? <NotificationsBell /> : null}

        <div className="hidden items-center gap-1 md:flex">
          <ThemeSwitcher variant="ghost" />

          <Button variant="outline" onClick={() => setCommandPaletteOpen(true)} aria-label="Search">
            <SearchIcon />
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
        </div>

        {/* Always top-right: avatar when signed in, sign-in CTA otherwise (all routes). */}
        {accountControl}
      </div>
    </nav>
  );
}
