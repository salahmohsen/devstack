import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "next-themes";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  ArchiveIcon,
  HouseIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  SystemIcon
} from "@tsu-stack/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { getGithubSetupStatusQueryOptions, useGetGithubSetupStatusQuery } from "@/features/github";

const themeOptions = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: SystemIcon, label: "System" }
] as const;

export function GithubPublicMobileNav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setupStatusQuery = useGetGithubSetupStatusQuery();
  const { theme, setTheme } = useTheme();

  const owner = setupStatusQuery.data?.owner ?? null;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onResponse: async () => {
          await Promise.all([
            queryClient.invalidateQueries(getAuthUserQueryOptions()),
            queryClient.invalidateQueries(getGithubSetupStatusQueryOptions())
          ]);
          await router.invalidate();
        }
      }
    });
  };

  const displayName = user?.name ?? user?.email ?? "GitHub";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="flex items-stretch border-t border-white/10 bg-[#0d1117] md:hidden">
      <Link
        to="/"
        preload={false}
        activeOptions={{ exact: true }}
        activeProps={{ className: "active" }}
        className={cn(
          "relative flex flex-1 items-center justify-center py-3 text-base-300 transition-colors",
          "[&.active]:bg-white/8 [&.active]:text-white"
        )}
      >
        <HouseIcon size={22} strokeWidth={1.8} />
      </Link>
      <Link
        to="/repos"
        preload={false}
        activeOptions={{ exact: true }}
        activeProps={{ className: "active" }}
        className={cn(
          "relative flex flex-1 items-center justify-center py-3 text-base-300 transition-colors",
          "[&.active]:bg-white/8 [&.active]:text-white"
        )}
      >
        <ArchiveIcon size={22} strokeWidth={1.8} />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center py-3 text-base-300 transition-colors"
            )}
          >
            <Avatar className="size-6 border border-white/10">
              <AvatarImage alt={displayName} src={user?.image ?? undefined} />
              <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
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
                    theme === opt.value
                      ? "bg-white/8 text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                  title={opt.label}
                >
                  <opt.icon size={13} strokeWidth={2} />
                </button>
              ))}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild disabled={!owner}>
              <Link to="/repos">
                <ArchiveIcon className="size-4" />
                Repositories
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard">
                <SettingsIcon className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
