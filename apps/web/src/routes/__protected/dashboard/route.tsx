import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "@/widgets/layout";

export const Route = createFileRoute("/__protected/dashboard")({
  component: DashboardLayout
});
