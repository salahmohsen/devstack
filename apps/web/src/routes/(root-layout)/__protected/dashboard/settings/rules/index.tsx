import { createFileRoute } from "@tanstack/react-router";

import { getListMailSmartRulesQueryOptions } from "@/features/mail-smart-rules";

import { SmartRulesSettings } from "@/pages/dashboard/settings/ui/smart-rules-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/rules/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getListMailSmartRulesQueryOptions());
  },
  component: SmartRulesSettings
});
