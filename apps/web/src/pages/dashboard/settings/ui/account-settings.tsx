import { useMutation } from "@tanstack/react-query";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";

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

import { SettingsFrame } from "./settings-frame";
import { UsernameSettingsCard } from "./username-settings-card";

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
    <SettingsFrame
      title="Account"
      description="Username, sessions, and sign-in security"
      contentClassName="space-y-8"
    >
      {accountEmail ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Signed in as
            </p>
            <p className="truncate text-sm font-medium text-foreground">{accountEmail}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Linked apps under{" "}
            <Link
              to="/dashboard/settings/connections"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Integrations
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:col-start-2">
          <UsernameSettingsCard />
        </div>
        <Frame className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <FrameHeader className="px-4 py-3">
            <FrameTitle>Sessions</FrameTitle>
            <FrameDescription className="text-xs text-pretty">
              Devices currently signed in. Revoke any you do not recognize.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="p-4">
            <AuthSessionManager
              sessions={sessions}
              isLoading={revokeSession.isPending || revokeOtherSessions.isPending}
              onRevoke={(id) => revokeSession.mutateAsync(id)}
              onRevokeAll={() => revokeOtherSessions.mutateAsync()}
              hideHeader
              maxListHeight={SESSIONS_LIST_MAX_HEIGHT}
              className="w-full max-w-none"
            />
          </FramePanel>
        </Frame>
        <Frame>
          <FrameHeader className="px-4 py-3">
            <FrameTitle>Passkeys</FrameTitle>
            <FrameDescription className="text-xs text-pretty">
              Passwordless sign-in with biometrics or a hardware security key.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="p-4">
            <PasskeyManager />
          </FramePanel>
        </Frame>
      </div>
    </SettingsFrame>
  );
};
