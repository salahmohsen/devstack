import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { getConnectionsStatusQueryOptions } from "@/features/connections";
import { getMailSettingsQueryOptions } from "@/features/mail-settings";

import { ConnectionsSettings } from "@/pages/dashboard/settings/ui/connections-settings";

const connectionsSearchSchema = z.object({
  // Better Auth OAuth link failures may redirect here with these params.
  error: z.string().optional().catch(undefined),
  error_description: z.string().optional().catch(undefined)
});

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/connections/")({
  validateSearch: zodValidator(connectionsSearchSchema),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getConnectionsStatusQueryOptions());
    void context.queryClient.prefetchQuery(getMailSettingsQueryOptions());
  },
  component: ConnectionsSettings
});
