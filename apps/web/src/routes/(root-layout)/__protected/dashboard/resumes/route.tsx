import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/resumes")({
  component: ResumesLayout
});

function ResumesLayout() {
  return <Outlet />;
}
