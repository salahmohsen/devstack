"use client";

import { Link } from "@tanstack/react-router";
import { BarChart3, ChevronsUpDown, Lock, LogOut } from "lucide-react";

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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@tsu-stack/ui/components/sidebar";

export function NavUser({
  onSignOut,
  user
}: {
  onSignOut: () => Promise<void>;
  user: {
    email: string;
    image?: string | null;
    name?: string | null;
  };
}) {
  const { isMobile } = useSidebar();
  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              size="lg"
            >
              <Avatar>
                <AvatarImage alt={user.name ?? user.email} src={user.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name ?? "Account"}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid gap-0.5">
                <span className="truncate font-medium">{user.name ?? "Account"}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <BarChart3 className="opacity-70" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/privacy-policy">
                  <Lock className="opacity-70" />
                  <span>Privacy Policy</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onSignOut()} variant="destructive">
              <LogOut className="opacity-70" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
