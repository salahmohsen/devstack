import { createFileRoute } from "@tanstack/react-router";

import { McpSettings } from "@/pages/dashboard/settings/ui/mcp-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/mcp/")({
  component: McpSettings
});
