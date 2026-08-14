import { Column, Heading, Img, Link, Row, Section, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

export type InviteUserEmailProps = {
  invitedEmail: string;
  invitedByName: string;
  invitedByEmail: string;
  invitedByImageUrl?: string | null;
  productName: string;
  productImageUrl?: string | null;
  inviteUrl: string;
  logoUrl?: string | null;
};

/**
 * Exact Vercel invite-user layout
 * (https://demo.react.email/preview/Community/notifications/vercel-invite-user).
 */
const InviteUserEmail = ({
  invitedEmail,
  invitedByName,
  invitedByEmail,
  invitedByImageUrl,
  productName,
  productImageUrl,
  inviteUrl,
  logoUrl
}: InviteUserEmailProps) => {
  const previewText = `Join ${invitedByName} on ${productName}`;
  const leftAvatar = invitedByImageUrl ?? logoUrl ?? productImageUrl;
  const rightAvatar = productImageUrl ?? logoUrl ?? invitedByImageUrl;

  return (
    <EmailLayout preview={previewText} logoUrl={logoUrl} logoAlt={productName}>
      <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
        Join <strong>{productName}</strong>
      </Heading>
      <Text className="text-[14px] leading-6 text-black">Hello {invitedEmail},</Text>
      <Text className="text-[14px] leading-6 text-black">
        <strong>{invitedByName}</strong> (
        <Link href={`mailto:${invitedByEmail}`} className="text-blue-600 no-underline">
          {invitedByEmail}
        </Link>
        ) has invited you to <strong>{productName}</strong>.
      </Text>
      {leftAvatar && rightAvatar ? (
        <Section>
          <Row>
            <Column align="right">
              <Img className="rounded-full" src={leftAvatar} width="64" height="64" alt="" />
            </Column>
            <Column align="center">
              <Text className="text-[18px] text-[#666666]">→</Text>
            </Column>
            <Column align="left">
              <Img className="rounded-full" src={rightAvatar} width="64" height="64" alt="" />
            </Column>
          </Row>
        </Section>
      ) : null}
      <EmailCta href={inviteUrl} label="Accept invitation" />
      <EmailFooterNote>
        This invitation was intended for <span className="text-black">{invitedEmail}</span>. If you
        were not expecting this invitation, you can ignore this email.
      </EmailFooterNote>
    </EmailLayout>
  );
};

export default InviteUserEmail;

InviteUserEmail.PreviewProps = {
  invitedEmail: "alan.turing@example.com",
  invitedByName: "Salah Mohsen",
  invitedByEmail: "contact@example.com",
  invitedByImageUrl: "https://example.com/logo192.png",
  productName: "DevHub",
  productImageUrl: "https://example.com/logo192.png",
  inviteUrl: "https://example.com/sign-in/create-an-account?invite=abc123",
  logoUrl: "https://example.com/logo192.png"
} satisfies InviteUserEmailProps;
