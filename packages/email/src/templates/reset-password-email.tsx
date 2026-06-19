import { Button, Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

const ResetPasswordEmail = ({ resetLink, username }: { resetLink: string; username: string }) => (
  <EmailLayout preview="Reset your password">
    <Text className="text-gray-800 text-2xl font-bold">Reset Your Password</Text>
    <Text className="text-gray-600">Hi {username},</Text>
    <Text className="text-gray-600">Click the button below to reset your password:</Text>
    <Button className="bg-blue-600 rounded-md px-6 py-3 font-medium text-white" href={resetLink}>
      Reset Password
    </Button>
    <Text className="text-gray-500 mt-6 text-sm">
      If you didn't request a password reset, you can safely ignore this email.
    </Text>
  </EmailLayout>
);

export default ResetPasswordEmail;

ResetPasswordEmail.PreviewProps = {
  resetLink: "https://example.com/reset-password",
  username: "John Doe"
};
