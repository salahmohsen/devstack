"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { useLocation } from "@tsu-stack/i18n/tanstack-start/hooks/use-location";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { PanelLeftIcon, Settings2Icon } from "@tsu-stack/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@tsu-stack/ui/components/sidebar";

import { NavMain } from "@/shared/ui/nav-main";
import { NavUser } from "@/shared/ui/nav-user";
import { DASHBOARD_TEAMS, TeamSwitcher } from "@/shared/ui/team-switcher";

const NAV_ITEMS = [
  {
    items: [
      {
        icon: PanelLeftIcon,
        title: "Overview",
        url: "/dashboard"
      }
    ],
    label: "Workspace"
  },
  {
    items: [
      {
        icon: Settings2Icon,
        items: [{ title: "GitHub Config", url: "/dashboard/github-config" }],
        title: "Settings"
      }
    ],
    label: "Settings"
  }
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useLocation();
  const { user } = useAuthSuspense();
  const normalizedPath = stripLocalePrefix(location.pathname);

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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={DASHBOARD_TEAMS} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain currentPath={normalizedPath} sections={NAV_ITEMS} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70">
        <NavUser
          onSignOut={handleSignOut}
          user={{
            email: user.email,
            image: user.image,
            name: user.name
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
