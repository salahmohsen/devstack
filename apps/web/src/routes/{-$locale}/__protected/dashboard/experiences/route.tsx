import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/experiences")({
  component: ExperiencesLayout
});

function ExperiencesLayout() {
  return <Outlet />;
}
