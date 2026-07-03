import { useMutation } from "@tanstack/react-query";
import { useLoaderData } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import AuthSessionManager from "@tsu-stack/ui/components/auth-session-manager";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";

export const AccountSettings = () => {
  const sessions = useLoaderData({
    from: "/(root-layout)/__protected/dashboard/settings/account/"
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => authClient.revokeSession({ token: id })
  });

  const revokeOtherSessions = useMutation({
    mutationFn: () => authClient.revokeOtherSessions()
  });

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle>Account</FrameTitle>
        <FrameDescription>Manage active sessions and sign out other devices.</FrameDescription>
      </FrameHeader>

      <FramePanel>
        <AuthSessionManager
          sessions={sessions}
          isLoading={revokeSession.isPending ?? revokeOtherSessions.isPending}
          onRevoke={(id) => revokeSession.mutate(id)}
          onRevokeAll={revokeOtherSessions.mutate}
          className="lg:min-w-1/2"
        />
      </FramePanel>
    </Frame>
  );
};
