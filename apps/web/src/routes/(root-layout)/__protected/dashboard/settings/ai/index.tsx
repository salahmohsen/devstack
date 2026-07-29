import { createFileRoute } from "@tanstack/react-router";

import { getAiSettingsQueryOptions } from "@/features/ai-settings";

import { AiSettings } from "@/pages/dashboard/settings/ui/ai-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/ai/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getAiSettingsQueryOptions());
  },
  component: AiSettings
});
