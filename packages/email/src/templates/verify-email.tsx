import { Heading, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

const VerifyEmail = ({
  url,
  username,
  logoUrl
}: {
  url: string;
  username: string;
  logoUrl?: string | null;
}) => (
  <EmailLayout preview="Verify your email address" logoUrl={logoUrl}>
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      Verify your email
    </Heading>
    <Text className="text-[14px] leading-6 text-black">Hi {username},</Text>
    <Text className="text-[14px] leading-6 text-black">
      Please click the button below to verify your email address:
    </Text>
    <EmailCta href={url} label="Verify email" />
    <EmailFooterNote>If you did not create an account, you can ignore this email.</EmailFooterNote>
  </EmailLayout>
);

export default VerifyEmail;

VerifyEmail.PreviewProps = {
  url: "https://example.com/verify-email",
  username: "John Doe",
  logoUrl: "https://example.com/logo192.png"
};
