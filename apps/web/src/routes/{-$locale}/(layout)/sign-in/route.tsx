import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/(layout)/sign-in")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
