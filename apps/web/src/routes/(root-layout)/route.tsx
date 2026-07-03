import { Outlet, createFileRoute } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { RootLayout } from "@/widgets/layout";

export const Route = createFileRoute("/(root-layout)")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(orpcQueryClient.profile.getContacts.queryOptions());
  },
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
