import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RootLayout } from "@/widgets/layout";

export const Route = createFileRoute("/(root-layout)")({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
