import { Heading, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

export type DigestItem = {
  title: string;
  body?: string | null;
  href?: string | null;
};

/**
 * Hourly (or batched) career notification digest. Same card as
 * {@link AppNotificationEmail}.
 */
const NotificationDigestEmail = ({
  items,
  dashboardUrl,
  logoUrl
}: {
  items: DigestItem[];
  dashboardUrl: string;
  logoUrl?: string | null;
}) => (
  <EmailLayout
    preview={`${items.length} career update${items.length === 1 ? "" : "s"}`}
    logoUrl={logoUrl}
  >
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      Your career digest
    </Heading>
    <Text className="text-[14px] leading-6 text-black">
      {items.length} update{items.length === 1 ? "" : "s"} since the last digest:
    </Text>
    {items.map((item, i) => (
      <Text key={`${item.title}-${i}`} className="text-[14px] leading-6 text-black">
        <strong>{item.title}</strong>
        {item.body ? ` — ${item.body}` : ""}
      </Text>
    ))}
    <EmailCta href={dashboardUrl} label="Open dashboard" />
    <EmailFooterNote>
      Digest mode is on in Settings → Notifications. Switch to immediate for one email per event.
    </EmailFooterNote>
  </EmailLayout>
);

export default NotificationDigestEmail;

NotificationDigestEmail.PreviewProps = {
  items: [
    { title: "Reply draft ready", body: "Acme Corp" },
    { title: "Important mail classified", body: "Interview invite" }
  ],
  dashboardUrl: "https://example.com/dashboard",
  logoUrl: "https://example.com/logo192.png"
};
