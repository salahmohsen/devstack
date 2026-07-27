import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Archive, House, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
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

import { primaryAppUrl } from "@/shared/lib/primary-app-url";

import { getGithubSetupStatusQueryOptions, useGetGithubSetupStatusQuery } from "@/features/github";

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
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : undefined;
  const setupStatusQuery = useGetGithubSetupStatusQuery(sessionProfileName);
  const { theme, setTheme } = useTheme();

  const owner = setupStatusQuery.data?.owner ?? null;

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          credentials: "include"
        }
      });
    } finally {
      // Drop cached session immediately (query staleTime is 5m).
      queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
      await queryClient.invalidateQueries({
        queryKey: getGithubSetupStatusQueryOptions(sessionProfileName).queryKey
      });
      await router.invalidate();
      await navigate({ to: "/" });
    }
  };

  const displayName = user?.name ?? user?.email ?? "GitHub";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="flex items-stretch border-t border-border bg-container md:hidden">
      <Link
        to="/"
        preload={false}
        activeOptions={{ exact: true }}
        activeProps={{ className: "active" }}
        className={cn(
          "relative flex flex-1 items-center justify-center py-3 text-accent-foreground transition-colors",
          "[&.active]:bg-white/8"
        )}
      >
        <House size={22} strokeWidth={1.8} />
      </Link>
      <Link
        to={sessionProfileName ? "/$profileName/repos" : "/repos"}
        params={sessionProfileName ? { profileName: sessionProfileName } : undefined}
        preload={false}
        activeOptions={{ exact: true }}
        activeProps={{ className: "active" }}
        className={cn(
          "relative flex flex-1 items-center justify-center py-3 text-accent-foreground transition-colors",
          "[&.active]:bg-white/8"
        )}
      >
        <Archive size={22} strokeWidth={1.8} />
      </Link>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              aria-label="Open account menu"
              className={cn(
                "flex flex-1 items-center justify-center py-3 text-accent-foreground transition-colors"
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
            {owner ? (
              <MenuLinkItem render={<Link to="/repos" />}>
                <Archive className="size-4" />
                Repositories
              </MenuLinkItem>
            ) : (
              <MenuItem disabled>
                <Archive className="size-4" />
                Repositories
              </MenuItem>
            )}
            <MenuLinkItem render={<a href={primaryAppUrl("/dashboard")} />}>
              <IconRotate mode="hover">
                <Settings className="size-4" />
              </IconRotate>
              Settings
            </MenuLinkItem>
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
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
