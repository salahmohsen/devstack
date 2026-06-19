import { Button, Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

const SendMagicLinkEmail = ({
  username,
  url,
  token
}: {
  username: string;
  url: string;
  token: string;
}) => {
  const link = url + "?token=" + token;
  return (
    <EmailLayout preview="Your magic link to sign in">
      <Text className="text-gray-800 text-2xl font-bold">Magic Link</Text>
      <Text className="text-gray-600">Hi {username},</Text>
      <Text className="text-gray-600">Please click the button below to sign in:</Text>
      <Button className="bg-blue-600 rounded-md px-6 py-3 font-medium text-white" href={link}>
        Sign In
      </Button>
      <Text className="text-gray-600 mt-4">Or copy and paste this link in your browser:</Text>
      <Text className="text-blue-600 font-medium break-all">{link}</Text>
      <Text className="text-gray-500 mt-6 text-sm">
        If you didn't request this magic link, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
};

export default SendMagicLinkEmail;

SendMagicLinkEmail.PreviewProps = {
  username: "John Doe",
  url: "https://example.com/magic-link",
  token: "123456"
};
