import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "@/widgets/layout";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard")({
  component: DashboardLayout
});
