import { Text } from "react-email";

import { EmailLayout } from "#@/templates/layout-email";

const WelcomeEmail = ({ username }: { username: string }) => (
  <EmailLayout preview="Welcome to our app!">
    <Text className="text-gray-800 text-2xl font-bold">Welcome to our app!</Text>
    <Text className="text-gray-600">Hi {username},</Text>
    <Text className="text-gray-600">
      Thank you for joining us. We're excited to have you on board!
    </Text>
    <Text className="text-gray-600 mt-6">
      If you have any questions or need assistance, feel free to contact our support team.
    </Text>
  </EmailLayout>
);

export default WelcomeEmail;

WelcomeEmail.PreviewProps = {
  username: "John Doe"
};
