import { createFileRoute } from "@tanstack/react-router";

import { getMailSettingsQueryOptions } from "@/features/mail-settings";

import { MailSettings } from "@/pages/dashboard/settings/ui/mail-settings";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/settings/mail/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getMailSettingsQueryOptions());
  },
  component: MailSettings
});
