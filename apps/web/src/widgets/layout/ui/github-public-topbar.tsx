import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Archive,
  Bug,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  SearchIcon,
  UserCircle
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
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
import { parseRepoTabLocation } from "@/shared/lib/repo-paths";
import { preloadRouteOnce } from "@/shared/lib/route-preload";
import { removeTab, useTabs } from "@/shared/lib/tab-store";
import { useGlobalShortcuts } from "@/shared/lib/use-global-shortcuts";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import { Tabs } from "@/widgets/layout/ui/github-public-tabs";

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
  const { user: admin } = useAuthSuspense();
  const setupStatus = queryClient.getQueryData(getGithubSetupStatusQueryOptions().queryKey);
  const isClient = useIsClient();
  const openTabs = useTabs();

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
        queryKey: getGithubSetupStatusQueryOptions().queryKey
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
      enabled: Boolean(owner),
      onTrigger: () => {
        void navigateRef.current({
          to: "/" as never
        });
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

  return (
    <nav className="flex h-(--navbar-height) min-w-0 items-center gap-3 overflow-hidden px-3 py-2">
      {admin && !pathname.includes("dashboard") && (
        <div className="hidden md:block">
          <Menu>
            <MenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="flex size-8 items-center justify-center rounded-full"
                />
              }
            >
              <Avatar className="size-7 border border-border">
                <AvatarImage src={admin?.image ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </MenuTrigger>
            <MenuPopup align="start" className="w-56">
              <MenuGroup>
                <MenuGroupLabel className="flex items-center gap-3 py-2">
                  <Avatar className="size-8 border border-border">
                    <AvatarImage src={admin?.image ?? undefined} alt={displayName} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{displayName}</span>
                    {owner && (
                      <span className="text-xs font-normal text-muted-foreground">@{owner}</span>
                    )}
                  </div>
                </MenuGroupLabel>
              </MenuGroup>
              <MenuSeparator />
              <MenuGroup>
                {owner ? (
                  <MenuLinkItem render={<Link to="/" />}>
                    <UserCircle size={16} strokeWidth={2} />
                    Profile
                    <MenuShortcut>G U</MenuShortcut>
                  </MenuLinkItem>
                ) : (
                  <MenuItem disabled>
                    <UserCircle size={16} strokeWidth={2} />
                    Profile
                    <MenuShortcut>G U</MenuShortcut>
                  </MenuItem>
                )}
                {owner ? (
                  <MenuLinkItem render={<Link to="/repos" />}>
                    <Archive size={16} strokeWidth={2} />
                    Repositories
                    <MenuShortcut>G O</MenuShortcut>
                  </MenuLinkItem>
                ) : (
                  <MenuItem disabled>
                    <Archive size={16} strokeWidth={2} />
                    Repositories
                    <MenuShortcut>G O</MenuShortcut>
                  </MenuItem>
                )}
                <MenuLinkItem render={<a href={primaryAppUrl("/dashboard")} />}>
                  <LayoutDashboard size={16} strokeWidth={2} />
                  Dashboard
                  <MenuShortcut>G D</MenuShortcut>
                </MenuLinkItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuGroup>
                {admin ? (
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
                ) : (
                  <MenuLinkItem render={<Link to="/sign-in" />}>
                    <UserCircle size={16} strokeWidth={2} />
                    Sign in
                  </MenuLinkItem>
                )}
              </MenuGroup>
            </MenuPopup>
          </Menu>
        </div>
      )}

      <Link to="/">
        <TextAnimate animation="slideLeft" by="character">
          Salah Mohsen
        </TextAnimate>
      </Link>

      {/* <div className="hidden shrink-0 items-center gap-0.5 md:flex">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            className="text-muted-foreground [&.active]:bg-surface-1 [&.active]:text-foreground"
            render={
              <Link
                to={item.to}
                params={item.params}
                preload={false}
                activeOptions={{ exact: true }}
                activeProps={{ className: "active" }}
              >
                <item.icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            }
          />
        ))}
      </div> */}

      <div className="min-w-0 flex-1 overflow-hidden">
        <Tabs tabsReady={isClient} routerRef={routerRef} />
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <ThemeSwitcher variant="ghost" />

        <Button variant="outline" onClick={() => setCommandPaletteOpen(true)} aria-label="Search">
          <SearchIcon />
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>

        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-surface-1"
                aria-label="More actions"
              />
            }
          >
            <MoreHorizontal className="size-5" strokeWidth={2} />
          </MenuTrigger>
          <MenuPopup align="end" className="w-48">
            <MenuLinkItem
              href="https://github.com/salahmohsen"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} strokeWidth={2} />
              View GitHub profile
            </MenuLinkItem>
            <MenuLinkItem
              href="https://github.com/salahmohsen/portfolio-v2/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bug size={16} strokeWidth={2} />
              Report an issue
            </MenuLinkItem>
            <MenuLinkItem render={<Link to="/sign-in" />}>
              <ExternalLink size={16} strokeWidth={2} />
              login
            </MenuLinkItem>
          </MenuPopup>
        </Menu>
      </div>
    </nav>
  );
}
