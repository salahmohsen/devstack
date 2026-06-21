import { useMutation } from "@tanstack/react-query";
import { useLoaderData } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import AuthSessionManager from "@tsu-stack/ui/components/auth-session-manager";

export const AccountSettings = () => {
  const sessions = useLoaderData({
    from: "/__protected/dashboard/settings/account/"
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => authClient.revokeSession({ token: id })
  });

  const revokeOtherSessions = useMutation({
    mutationFn: () => authClient.revokeOtherSessions()
  });

  return (
    <div>
      <AuthSessionManager
        sessions={sessions}
        isLoading={revokeSession.isPending ?? revokeOtherSessions.isPending}
        onRevoke={(id) => revokeSession.mutate(id)}
        onRevokeAll={revokeOtherSessions.mutate}
      />
    </div>
  );
};
