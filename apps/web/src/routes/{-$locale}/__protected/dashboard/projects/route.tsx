import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/projects")({
  component: ProjectsLayout
});

function ProjectsLayout() {
  return <Outlet />;
}
