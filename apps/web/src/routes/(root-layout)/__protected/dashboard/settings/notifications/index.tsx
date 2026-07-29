import { createFileRoute } from "@tanstack/react-router";

import { getNotificationSettingsQueryOptions } from "@/features/notification-settings";

import { NotificationSettings } from "@/pages/dashboard/settings/ui/notification-settings";

export const Route = createFileRoute(
  "/(root-layout)/__protected/dashboard/settings/notifications/"
)({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getNotificationSettingsQueryOptions());
  },
  component: NotificationSettings
});
