import { Heading, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

export type AppNotificationEmailProps = {
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  actionLabel?: string;
  /** Optional greeting line, e.g. "Hello salah," */
  greeting?: string | null;
  logoUrl?: string | null;
};

/**
 * Career / product notification. Same card as invite and digest so kinds
 * only differ by heading, body, and CTA.
 */
const AppNotificationEmail = ({
  title,
  body,
  actionUrl,
  actionLabel = "Open in dashboard",
  greeting,
  logoUrl
}: AppNotificationEmailProps) => (
  <EmailLayout preview={title} logoUrl={logoUrl}>
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      {title}
    </Heading>
    {greeting ? <Text className="text-[14px] leading-6 text-black">{greeting}</Text> : null}
    {body ? <Text className="text-[14px] leading-6 text-black">{body}</Text> : null}
    {actionUrl ? <EmailCta href={actionUrl} label={actionLabel} /> : null}
    <EmailFooterNote>
      You received this because email is enabled for this notification in Settings → Notifications.
      If you were not expecting it, you can ignore this email.
    </EmailFooterNote>
  </EmailLayout>
);

export default AppNotificationEmail;

AppNotificationEmail.PreviewProps = {
  title: "Career mail classified",
  greeting: "Hello salah,",
  body: "recruiter · Acme Corp — thanks for your application",
  actionUrl: "https://example.com/dashboard/mail/all",
  actionLabel: "Open mail",
  logoUrl: "https://example.com/logo192.png"
} satisfies AppNotificationEmailProps;
