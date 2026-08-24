import { Outlet, createFileRoute } from "@tanstack/react-router";

import { assertPlaygroundEnabled } from "@/shared/lib/playground";

/**
 * Dev-only lab under /playground. Production and preview builds 404 here.
 */
export const Route = createFileRoute("/(root-layout)/__protected/playground")({
  beforeLoad: () => {
    assertPlaygroundEnabled();
  },
  component: () => <Outlet />
});
