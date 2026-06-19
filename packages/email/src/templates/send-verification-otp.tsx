import { Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

const SendVerificationOTP = ({ username, otp }: { username: string; otp: string }) => (
  <EmailLayout preview="Your verification code">
    <Text className="text-gray-800 text-2xl font-bold">Verify your email</Text>
    <Text className="text-gray-600">Hi {username},</Text>
    <Text className="text-gray-600">
      Please enter the following code to verify your email address:
    </Text>
    <Text className="bg-gray-100 my-4 block px-6 py-3 text-center font-mono text-xl">{otp}</Text>
    <Text className="text-gray-500 mt-6 text-sm">
      If you didn't request this code, you can safely ignore this email.
    </Text>
  </EmailLayout>
);

export default SendVerificationOTP;

SendVerificationOTP.PreviewProps = {
  username: "John Doe",
  otp: "596853"
};
