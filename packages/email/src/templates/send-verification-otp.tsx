import { Heading, Text } from "react-email";

import { EmailFooterNote, EmailLayout } from "#@/templates/layout-email";

const SendVerificationOTP = ({
  username,
  otp,
  logoUrl
}: {
  username: string;
  otp: string;
  logoUrl?: string | null;
}) => (
  <EmailLayout preview="Your verification code" logoUrl={logoUrl}>
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      Verify your email
    </Heading>
    <Text className="text-[14px] leading-6 text-black">Hi {username},</Text>
    <Text className="text-[14px] leading-6 text-black">
      Please enter the following code to verify your email address:
    </Text>
    <Text className="my-4 block bg-[#f4f4f4] px-6 py-3 text-center font-mono text-xl">{otp}</Text>
    <EmailFooterNote>
      If you didn&apos;t request this code, you can ignore this email.
    </EmailFooterNote>
  </EmailLayout>
);

export default SendVerificationOTP;

SendVerificationOTP.PreviewProps = {
  username: "John Doe",
  otp: "596853",
  logoUrl: "https://example.com/logo192.png"
};
