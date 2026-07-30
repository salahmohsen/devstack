import { useMutation } from "@tanstack/react-query";
import { useLoaderData, useRouter } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import AuthSessionManager from "@tsu-stack/ui/components/auth-session-manager";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";

import { PasskeyManager } from "@/pages/dashboard/settings/ui/passkey-manager";

import { SettingsSection } from "./settings-section";

/** Scroll sessions after this height (~3–4 session cards). */
const SESSIONS_LIST_MAX_HEIGHT = "22rem";

export const AccountSettings = () => {
  const router = useRouter();
  const sessions = useLoaderData({
    from: "/(root-layout)/__protected/dashboard/settings/account/"
  });
  const { data: session } = authClient.useSession();
  const accountEmail = session?.user?.email;

  const revokeSession = useMutation({
    mutationFn: (id: string) => authClient.revokeSession({ token: id }),
    onSuccess: () => {
      void router.invalidate();
    }
  });

  const revokeOtherSessions = useMutation({
    mutationFn: () => authClient.revokeOtherSessions(),
    onSuccess: () => {
      void router.invalidate();
    }
  });

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle>Account</FrameTitle>
        <FrameDescription>
          Sessions, passkeys, and how you sign in. Linked apps live under Connections.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="space-y-8">
        {accountEmail ? (
          <SettingsSection title="Signed in as" description="Account email for this session.">
            <p className="text-sm text-foreground">{accountEmail}</p>
          </SettingsSection>
        ) : null}

        {/*
          Two columns on large screens: sessions | passkeys (security surface pair).
          Stacked on smaller viewports. Sessions list scrolls after max height.
        */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-6">
          <SettingsSection
            title="Sessions"
            description="Devices currently signed in. Revoke any you do not recognize."
            className="min-w-0"
          >
            <AuthSessionManager
              sessions={sessions}
              isLoading={revokeSession.isPending || revokeOtherSessions.isPending}
              onRevoke={(id) => revokeSession.mutate(id)}
              onRevokeAll={() => revokeOtherSessions.mutate()}
              hideHeader
              maxListHeight={SESSIONS_LIST_MAX_HEIGHT}
              className="w-full max-w-none"
            />
          </SettingsSection>

          <SettingsSection
            title="Passkeys"
            description="Passwordless sign-in with biometrics or a hardware security key."
            className="min-w-0"
          >
            <PasskeyManager />
          </SettingsSection>
        </div>

        <p className="text-xs text-muted-foreground">
          Linked apps (Google, Gmail, GitHub) live under{" "}
          <a href="/dashboard/settings/connections" className="underline-offset-2 hover:underline">
            Connections
          </a>
          .
        </p>
      </FramePanel>
    </Frame>
  );
};
