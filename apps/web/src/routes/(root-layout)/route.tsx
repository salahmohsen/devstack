import { Outlet, createFileRoute } from "@tanstack/react-router";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

import { RootLayout } from "@/widgets/layout";

export const Route = createFileRoute("/(root-layout)")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getPortfolioListQueryOptions());
  },
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
