import { createFileRoute } from "@tanstack/react-router";

import { getCustomDomainQueryOptions } from "@/features/domain";

import { DomainSettings } from "@/pages/dashboard/settings/ui/domain-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/domain/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(getCustomDomainQueryOptions());
  }
});

function RouteComponent() {
  return <DomainSettings />;
}
