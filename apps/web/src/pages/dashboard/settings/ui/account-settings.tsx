import { useMutation } from "@tanstack/react-query";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { FingerprintIcon, MonitorSmartphoneIcon } from "lucide-react";

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
    <div className="flex flex-col gap-4">
      {accountEmail ? (
        <Frame>
          <FramePanel className="flex flex-wrap items-baseline justify-between gap-2 py-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Signed in as
              </p>
              <p className="truncate text-sm font-medium text-foreground">{accountEmail}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Linked apps under{" "}
              <a
                href="/dashboard/settings/connections"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Connections
              </a>
            </p>
          </FramePanel>
        </Frame>
      ) : null}

      {/*
        Separate frames for security surfaces. Two columns on large screens;
        stacked on small. Sessions list scrolls after max height.
      */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Frame className="min-w-0">
          <FrameHeader>
            <FrameTitle className="flex items-center gap-2">
              <MonitorSmartphoneIcon className="size-4 opacity-80" aria-hidden />
              Sessions
            </FrameTitle>
            <FrameDescription>
              Devices currently signed in. Revoke any you do not recognize.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="min-w-0">
            <AuthSessionManager
              sessions={sessions}
              isLoading={revokeSession.isPending || revokeOtherSessions.isPending}
              onRevoke={(id) => revokeSession.mutate(id)}
              onRevokeAll={() => revokeOtherSessions.mutate()}
              hideHeader
              maxListHeight={SESSIONS_LIST_MAX_HEIGHT}
              className="w-full max-w-none"
            />
          </FramePanel>
        </Frame>

        <Frame className="min-w-0">
          <FrameHeader>
            <FrameTitle className="flex items-center gap-2">
              <FingerprintIcon className="size-4 opacity-80" aria-hidden />
              Passkeys
            </FrameTitle>
            <FrameDescription>
              Passwordless sign-in with biometrics or a hardware security key.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="min-w-0">
            <PasskeyManager />
          </FramePanel>
        </Frame>
      </div>
    </div>
  );
};
