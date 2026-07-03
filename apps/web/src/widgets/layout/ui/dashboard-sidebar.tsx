import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Footer,
  Sidebar001Item,
  Sidebar001Section
} from "@tsu-stack/ui/components/unlumen-ui/sidebar-001";

export function DashboardSidebar() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useLocation();
  const { user } = useAuthSuspense();
  const pathname = location.pathname;

  if (!user) {
    return null;
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onResponse: async () => {
          await queryClient.invalidateQueries(getAuthUserQueryOptions());
          await router.invalidate();
        }
      }
    });
  }

  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <Sidebar001>
      <Sidebar001Content>
        <Sidebar001Section>
          <Sidebar001Item href="/dashboard" label="Overview" isActive={pathname === "/dashboard"} />
        </Sidebar001Section>

        <Sidebar001Section label="Portfolio">
          <Sidebar001Item
            href="/dashboard/experiences"
            label="Experiences"
            isActive={pathname === "/dashboard/experiences"}
          />
          <Sidebar001Item
            href="/dashboard/projects"
            label="Projects"
            isActive={pathname === "/dashboard/projects"}
          />
          <Sidebar001Item
            href="/dashboard/stacks"
            label="Stacks"
            isActive={pathname === "/dashboard/stacks"}
          />
        </Sidebar001Section>

        <Sidebar001Section label="Settings">
          <Sidebar001Item
            href="/dashboard/settings/profile"
            label="Profile"
            isActive={pathname.startsWith("/dashboard/settings/profile")}
          />
          <Sidebar001Item
            href="/dashboard/settings/account"
            label="Account"
            isActive={pathname.startsWith("/dashboard/settings/account")}
          />
          <Sidebar001Item
            href="/dashboard/settings/github"
            label="Github"
            isActive={pathname.startsWith("/dashboard/settings/github")}
          />
        </Sidebar001Section>
      </Sidebar001Content>
      <Sidebar001Footer>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Account"}</p>
            <p className="truncate text-xs text-foreground/70">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
}
