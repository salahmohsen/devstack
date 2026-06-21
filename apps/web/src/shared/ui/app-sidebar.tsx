"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { Building, Code, FileText, Package, PanelLeft, Settings2 } from "lucide-react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@tsu-stack/ui/components/sidebar";
import { cn } from "@tsu-stack/ui/lib/utils";

import { NavMain } from "@/shared/ui/nav-main";
import { NavUser } from "@/shared/ui/nav-user";
import { DASHBOARD_TEAMS, TeamSwitcher } from "@/shared/ui/team-switcher";

const NAV_ITEMS = [
  {
    items: [
      {
        icon: PanelLeft,
        title: "Overview",
        url: "/dashboard"
      }
    ],
    label: "Workspace"
  },
  {
    items: [
      {
        icon: FileText,
        items: [
          { icon: Building, title: "Experiences", url: "/dashboard/experiences" },
          { icon: Code, title: "Projects", url: "/dashboard/projects" },
          { icon: Package, title: "Stacks", url: "/dashboard/stacks" }
        ],
        title: "Resume"
      }
    ],
    label: "Portfolio"
  },
  {
    items: [
      {
        icon: Settings2,
        items: [
          { title: "Profile", url: "/dashboard/settings/profile" },
          { title: "Account", url: "/dashboard/settings/account" },
          { title: "Github", url: "/dashboard/settings/github" }
        ],
        title: "Settings"
      }
    ],
    label: "Settings"
  }
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { className, ...restProps } = props;
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useLocation();
  const { user } = useAuthSuspense();

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
    <Sidebar collapsible="icon" className={cn("*:bg-container fixed", className)} {...restProps}>
      <SidebarHeader>
        <TeamSwitcher teams={DASHBOARD_TEAMS} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain currentPath={location.pathname} sections={NAV_ITEMS} />
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
