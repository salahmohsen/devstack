import { Heading, Text } from "react-email";

import { EmailCta, EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

const ResetPasswordEmail = ({
  resetLink,
  username,
  logoUrl
}: {
  resetLink: string;
  username: string;
  logoUrl?: string | null;
}) => (
  <EmailLayout preview="Reset your password" logoUrl={logoUrl}>
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      Reset your password
    </Heading>
    <Text className="text-[14px] leading-6 text-black">Hi {username},</Text>
    <Text className="text-[14px] leading-6 text-black">
      Click the button below to reset your password:
    </Text>
    <EmailCta href={resetLink} label="Reset password" />
    <EmailFooterNote>
      If you didn&apos;t request a password reset, you can ignore this email.
    </EmailFooterNote>
  </EmailLayout>
);

export default ResetPasswordEmail;

ResetPasswordEmail.PreviewProps = {
  resetLink: "https://example.com/reset-password",
  username: "John Doe",
  logoUrl: "https://example.com/logo192.png"
};
