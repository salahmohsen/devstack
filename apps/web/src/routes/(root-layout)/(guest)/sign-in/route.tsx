import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(root-layout)/(guest)/sign-in")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
