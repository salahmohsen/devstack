import { createFileRoute, redirect } from "@tanstack/react-router";

import { isSuperAdminRole } from "@tsu-stack/core";

import { AdminLayout } from "@/pages/dashboard/admin";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/admin")({
  component: AdminLayout,
  beforeLoad: ({ context, location }) => {
    if (!isSuperAdminRole(context.user?.role)) {
      throw redirect({ to: "/dashboard/agent" });
    }
    const path = location.pathname.replace(/\/$/, "");
    if (path === "/dashboard/admin") {
      throw redirect({ to: "/dashboard/admin/users" });
    }
  }
});
