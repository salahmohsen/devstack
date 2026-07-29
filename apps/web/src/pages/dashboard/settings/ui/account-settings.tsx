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

import { SettingsSection } from "./settings-section";

export const AccountSettings = () => {
  const sessions = useLoaderData({
    from: "/(root-layout)/__protected/dashboard/settings/account/"
  });
  const { data: session } = authClient.useSession();
  const accountEmail = session?.user?.email;

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

      <FramePanel className="space-y-8">
        {accountEmail ? (
          <SettingsSection title="Signed in as" description="Account email for this session.">
            <p className="text-sm text-foreground">{accountEmail}</p>
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Sessions"
          description="Devices currently signed in to your account. Revoke any you do not recognize."
        >
          <AuthSessionManager
            sessions={sessions}
            isLoading={revokeSession.isPending || revokeOtherSessions.isPending}
            onRevoke={(id) => revokeSession.mutate(id)}
            onRevokeAll={revokeOtherSessions.mutate}
            hideHeader
            className="w-full max-w-none"
          />
          <p className="text-xs text-muted-foreground">
            Password and connected-account management will live here as security features expand.
            Sessions above control signed-in devices.
          </p>
        </SettingsSection>
      </FramePanel>
    </Frame>
  );
};
