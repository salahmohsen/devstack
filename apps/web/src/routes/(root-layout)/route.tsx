import { Outlet, createFileRoute } from "@tanstack/react-router";

import { GithubPublicLayout } from "@/widgets/layout";

export const Route = createFileRoute("/(root-layout)")({
  component: () => (
    <GithubPublicLayout>
      <Outlet />
    </GithubPublicLayout>
  )
});
