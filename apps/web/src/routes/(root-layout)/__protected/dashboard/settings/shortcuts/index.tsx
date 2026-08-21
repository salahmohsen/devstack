import { createFileRoute } from "@tanstack/react-router";

import { ShortcutsSettings } from "@/pages/dashboard/settings/ui/shortcuts-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/shortcuts/")({
  component: ShortcutsSettings
});
