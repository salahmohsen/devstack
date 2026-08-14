import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/mail/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings/connections", replace: true });
  }
});
