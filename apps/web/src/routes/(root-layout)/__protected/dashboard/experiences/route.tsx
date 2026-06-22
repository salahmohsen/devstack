import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/experiences")({
  component: ExperiencesLayout
});

function ExperiencesLayout() {
  return <Outlet />;
}
