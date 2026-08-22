import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/invites/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/admin/invites" });
  },
  component: () => null
});
