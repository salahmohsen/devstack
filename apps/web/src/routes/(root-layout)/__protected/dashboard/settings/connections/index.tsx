import { createFileRoute } from "@tanstack/react-router";

import { getConnectionsStatusQueryOptions } from "@/features/connections";

import { ConnectionsSettings } from "@/pages/dashboard/settings/ui/connections-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/connections/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getConnectionsStatusQueryOptions());
  },
  component: ConnectionsSettings
});
