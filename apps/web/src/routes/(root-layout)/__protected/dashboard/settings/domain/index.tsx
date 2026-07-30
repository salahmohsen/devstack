import { createFileRoute } from "@tanstack/react-router";

import { getCustomDomainQueryOptions } from "@/features/domain";

import { DomainSettings } from "@/pages/dashboard/settings/ui/domain-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/domain/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    // Await after parent auth (ensureQueryData for user already ran). Swallow
    // failures so a cancelled/401 SSR prefetch does not block navigation —
    // the page query refetches on mount with full browser credentials.
    try {
      await context.queryClient.ensureQueryData(getCustomDomainQueryOptions());
    } catch {
      // Client useGetCustomDomainQuery retries / surfaces a real error.
    }
  }
});

function RouteComponent() {
  return <DomainSettings />;
}
