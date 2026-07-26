import { Outlet, createFileRoute } from "@tanstack/react-router";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

import { RootLayout } from "@/widgets/layout";

export const Route = createFileRoute("/(root-layout)")({
  // Awaited: RootLayout sidebar + home sections use this during SSR.
  // Fire-and-forget prefetch dehydrates as pending and aborts after render
  // (Serialization timeout / CancelledError / rpc-fetch-failed AbortError).
  loader: ({ context }) => context.queryClient.ensureQueryData(getPortfolioListQueryOptions()),
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
