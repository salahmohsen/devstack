import { Heading, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

const SendMagicLinkEmail = ({
  username,
  url,
  token,
  logoUrl
}: {
  username: string;
  url: string;
  token: string;
  logoUrl?: string | null;
}) => {
  const link = url + "?token=" + token;
  return (
    <EmailLayout preview="Your magic link to sign in" logoUrl={logoUrl}>
      <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
        Sign in to <strong>DEVSTACK</strong>
      </Heading>
      <Text className="text-[14px] leading-6 text-black">Hi {username},</Text>
      <Text className="text-[14px] leading-6 text-black">
        Please click the button below to sign in:
      </Text>
      <EmailCta href={link} label="Sign in" />
      <EmailFooterNote>
        If you didn&apos;t request this magic link, you can ignore this email.
      </EmailFooterNote>
    </EmailLayout>
  );
};

export default SendMagicLinkEmail;

SendMagicLinkEmail.PreviewProps = {
  username: "John Doe",
  url: "https://example.com/magic-link",
  token: "123456",
  logoUrl: "https://example.com/logo192.png"
};
