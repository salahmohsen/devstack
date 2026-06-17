import { Outlet } from "@tanstack/react-router";

import { Separator } from "@tsu-stack/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@tsu-stack/ui/components/sidebar";

import { AppSidebar } from "@/shared/ui/app-sidebar";

import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator className="mr-2 h-4 opacity-60" orientation="vertical" />
            <DashboardBreadcrumbs />
          </div>
        </header>
        <div className="flex flex-1 flex-col px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
