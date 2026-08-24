import { Heading, Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

const WelcomeEmail = ({ username, logoUrl }: { username: string; logoUrl?: string | null }) => (
  <EmailLayout preview="Welcome to DEVSTACK" logoUrl={logoUrl}>
    <Heading className="mx-0 my-7.5 p-0 text-center text-[24px] font-normal text-black">
      Welcome to <strong>DEVSTACK</strong>
    </Heading>
    <Text className="text-[14px] leading-6 text-black">Hi {username},</Text>
    <Text className="text-[14px] leading-6 text-black">
      Thank you for joining us. We&apos;re excited to have you on board.
    </Text>
  </EmailLayout>
);

export default WelcomeEmail;

WelcomeEmail.PreviewProps = {
  username: "John Doe",
  logoUrl: "https://example.com/logo192.png"
};
