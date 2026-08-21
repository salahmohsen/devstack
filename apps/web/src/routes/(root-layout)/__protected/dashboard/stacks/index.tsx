import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/skills", replace: true });
  }
});
