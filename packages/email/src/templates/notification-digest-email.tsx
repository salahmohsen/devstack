import { Button, Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

export type DigestItem = {
  title: string;
  body?: string | null;
  href?: string | null;
};

/**
 * Hourly (or batched) career notification digest.
 */
const NotificationDigestEmail = ({
  items,
  dashboardUrl
}: {
  items: DigestItem[];
  dashboardUrl: string;
}) => (
  <EmailLayout preview={`${items.length} career update${items.length === 1 ? "" : "s"}`}>
    <Text className="text-2xl font-bold text-gray-800">Your career digest</Text>
    <Text className="text-gray-600">
      {items.length} update{items.length === 1 ? "" : "s"} since the last digest:
    </Text>
    {items.map((item, i) => (
      <Text key={`${item.title}-${i}`} className="text-gray-700">
        <strong>{item.title}</strong>
        {item.body ? ` — ${item.body}` : ""}
      </Text>
    ))}
    <Button
      className="mt-4 rounded-md bg-blue-600 px-6 py-3 font-medium text-white"
      href={dashboardUrl}
    >
      Open dashboard
    </Button>
    <Text className="mt-6 text-sm text-gray-500">
      Digest mode is on in Settings → Notifications. Switch to immediate for one email per event.
    </Text>
  </EmailLayout>
);

export default NotificationDigestEmail;

NotificationDigestEmail.PreviewProps = {
  items: [
    { title: "Reply draft ready", body: "Acme Corp" },
    { title: "Important mail classified", body: "Interview invite" }
  ],
  dashboardUrl: "https://example.com/dashboard"
};
