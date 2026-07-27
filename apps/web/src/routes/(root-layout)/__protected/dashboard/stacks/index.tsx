import { createFileRoute } from "@tanstack/react-router";

import { StacksPage } from "@/pages/dashboard/stacks";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/")({
  component: StacksPage
});
