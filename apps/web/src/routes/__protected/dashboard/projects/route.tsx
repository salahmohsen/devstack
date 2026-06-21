import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/__protected/dashboard/projects")({
  component: ProjectsLayout
});

function ProjectsLayout() {
  return <Outlet />;
}
