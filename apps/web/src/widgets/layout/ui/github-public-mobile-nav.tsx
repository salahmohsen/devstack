import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Archive, House, LogOut, Monitor, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { useTheme } from "next-themes";

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
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  publicPortfolioHomeLocation,
  publicReposListLocation,
  usePublicSurface
} from "@/shared/lib/public-surface";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";
import { PrimaryAppMenuLink } from "@/shared/ui/primary-app-menu-link";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

const themeOptions = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" }
] as const;

export function MobileNav() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionUsername = sessionUsernameFromUser(user) ?? undefined;
  const ownSurface = usePublicSurface(sessionUsername ?? "");
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        credentials: "include"
      }
    });
    // Drop cached session immediately (query staleTime is 5m).
    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
    await queryClient.invalidateQueries({
      queryKey: getGithubSetupStatusQueryOptions(sessionUsername).queryKey
    });
    await router.invalidate();
    await navigate({ to: "/" });
  };

  const displayName = user?.name ?? user?.email ?? "GitHub";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const itemClass = cn(
    "relative flex min-h-11 flex-1 items-center justify-center py-2.5 text-accent-foreground transition-colors",
    "[&.active]:bg-white/8"
  );

  return (
    // Bottom padding must live on the nav (not a flex sibling) so icons sit above
    // the home indicator / Safari bottom chrome on iPhone.
    <nav
      className={cn(
        "z-40 shrink-0 border-t border-border bg-container md:hidden",
        "pb-[env(safe-area-inset-bottom,0px)]"
      )}
      aria-label="Mobile"
    >
      <div className="flex items-stretch">
        <Link
          to="/"
          preload={false}
          activeOptions={{ exact: true }}
          activeProps={{ className: "active" }}
          className={itemClass}
        >
          <House size={22} strokeWidth={1.8} />
        </Link>
        {(() => {
          const loc = sessionUsername
            ? publicReposListLocation(ownSurface)
            : ({ to: "/repos" as const } as const);
          return (
            <Link
              to={loc.to}
              params={"params" in loc ? loc.params : undefined}
              preload={false}
              activeOptions={{ exact: true }}
              activeProps={{ className: "active" }}
              className={itemClass}
            >
              <Archive size={22} strokeWidth={1.8} />
            </Link>
          );
        })()}
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                aria-label="Open account menu"
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center py-2.5 text-accent-foreground transition-colors"
                )}
              />
            }
          >
            <Avatar className="size-6 border border-white/10">
              <AvatarImage alt={displayName} src={user?.image ?? undefined} />
              <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
            </Avatar>
          </MenuTrigger>
          <MenuPopup align="end" side="top" className="w-56">
            <MenuGroup>
              <MenuGroupLabel className="flex items-center justify-between">
                <div>
                  <p>{displayName}</p>
                  <p className="font-normal text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex items-center gap-0.5 rounded-md border border-white/10 p-0.5">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-sm transition-colors",
                        theme === opt.value ? "bg-white/8" : "hover:text-muted-foreground"
                      )}
                      aria-label={opt.label}
                      title={opt.label}
                    >
                      <opt.icon size={13} strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </MenuGroupLabel>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              {sessionUsername ? (
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
                  <UserCircle className="size-4" />
                  Profile
                </MenuLinkItem>
              ) : (
                <MenuItem disabled>
                  <UserCircle className="size-4" />
                  Profile
                </MenuItem>
              )}
              {sessionUsername ? (
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
                  <Archive className="size-4" />
                  Repositories
                </MenuLinkItem>
              ) : (
                <MenuItem disabled>
                  <Archive className="size-4" />
                  Repositories
                </MenuItem>
              )}
              <PrimaryAppMenuLink path="/dashboard" label="Settings">
                <IconRotate mode="hover">
                  <Settings className="size-4" />
                </IconRotate>
                Settings
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
            ) : null}
          </MenuPopup>
        </Menu>
      </div>
    </nav>
  );
}
