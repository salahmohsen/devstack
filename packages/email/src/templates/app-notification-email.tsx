import { Button, Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

/**
 * System notification for career events (draft ready, important mail, stage auto-update).
 * Distinct from auth templates; CTA links into the dashboard when `actionUrl` is set.
 */
const AppNotificationEmail = ({
  title,
  body,
  actionUrl,
  actionLabel = "Open in dashboard"
}: {
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  actionLabel?: string;
}) => (
  <EmailLayout preview={title}>
    <Text className="text-2xl font-bold text-gray-800">{title}</Text>
    {body ? <Text className="text-gray-600">{body}</Text> : null}
    {actionUrl ? (
      <Button
        className="mt-4 rounded-md bg-blue-600 px-6 py-3 font-medium text-white"
        href={actionUrl}
      >
        {actionLabel}
      </Button>
    ) : null}
    <Text className="mt-6 text-sm text-gray-500">
      You received this because email is enabled for this notification kind in Settings →
      Notifications.
    </Text>
  </EmailLayout>
);

export default AppNotificationEmail;

AppNotificationEmail.PreviewProps = {
  title: "Reply draft ready",
  body: "Acme Corp — thanks for your application",
  actionUrl: "https://example.com/dashboard/review",
  actionLabel: "Open Review"
};
