"use client";

import { CheckCircle2Icon, RefreshCwIcon, UnplugIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { formatGithubAccessSummary } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { StatusSubmitButton } from "@tsu-stack/ui/components/status-submit-button";

import { primaryAppUrl } from "@/shared/lib/primary-app-url";
import {
  IntegrationBrandMark,
  IntegrationCard,
  IntegrationMeta
} from "@/shared/ui/integration-card";

import { useDisconnectProviderMutation } from "@/features/connections/api/disconnect-provider.mutation";
import { useGetConnectionsStatusQuery } from "@/features/connections/api/get-connections-status.query";
import { useRefreshGithubMutation } from "@/features/connections/api/refresh-github.mutation";

const OAUTH_LINK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "That Google account is already linked to a different user.",
  unable_to_link_account: "Could not link this account. Try again or use a different Google login.",
  access_denied: "Google access was denied. No changes were made.",
  oauth_provider_not_found: "This provider is not configured on the server."
};

function ConnectionStatusBadge({ state }: { state: "connected" | "disconnected" | "unavailable" }) {
  if (state === "connected") {
    return (
      <Badge variant="success" size="sm" className="gap-1">
        <CheckCircle2Icon className="size-3" aria-hidden />
        Connected
      </Badge>
    );
  }
  if (state === "unavailable") {
    return (
      <Badge variant="secondary" size="sm">
        Not configured
      </Badge>
    );
  }
  return (
    <Badge variant="outline" size="sm">
      Not connected
    </Badge>
  );
}

function formatConnectionTime(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function ConnectionsIntegrations({
  callbackPath,
  oauthError,
  oauthErrorDescription,
  onClearOauthError,
  extra
}: {
  /** Path Better Auth returns to after link (include search if needed). */
  callbackPath: string;
  oauthError?: string;
  oauthErrorDescription?: string;
  onClearOauthError?: () => void;
  extra?: ReactNode;
}) {
  const query = useGetConnectionsStatusQuery();
  const refreshGithub = useRefreshGithubMutation();
  const disconnectProviderMutation = useDisconnectProviderMutation();
  const [busy, setBusy] = useState<"google" | "github" | "unlink-google" | "unlink-github" | null>(
    null
  );
  const [disconnectTarget, setDisconnectTarget] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    if (!oauthError) return;
    toast.error(
      OAUTH_LINK_ERROR_MESSAGES[oauthError] ??
        oauthErrorDescription ??
        `Could not connect account (${oauthError.replaceAll("_", " ")}).`
    );
    onClearOauthError?.();
  }, [oauthError, oauthErrorDescription, onClearOauthError]);

  async function connectGoogle() {
    setBusy("google");
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: primaryAppUrl(callbackPath),
        errorCallbackURL: primaryAppUrl(callbackPath)
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Google connect");
      setBusy(null);
    }
  }

  async function startGithubOAuth() {
    setBusy("github");
    try {
      await authClient.linkSocial({
        provider: "github",
        callbackURL: primaryAppUrl(callbackPath),
        errorCallbackURL: primaryAppUrl(callbackPath)
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start GitHub connect");
      setBusy(null);
    }
  }

  async function reconnectGithub() {
    setBusy("github");
    try {
      const result = await refreshGithub.mutateAsync({});
      if (result.ok) {
        toast.success("GitHub connection is active");
        setBusy(null);
        return;
      }
      toast.message("GitHub needs a new authorization. Opening GitHub…");
      await startGithubOAuth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh GitHub");
      setBusy(null);
    }
  }

  async function disconnectProvider(provider: "google" | "github") {
    const unlinkBusy = provider === "google" ? "unlink-google" : "unlink-github";
    setBusy(unlinkBusy);
    try {
      await disconnectProviderMutation.mutateAsync({ provider });
      toast.success(provider === "google" ? "Google disconnected" : "GitHub disconnected");
      setDisconnectTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : provider === "google"
            ? "Could not disconnect Google"
            : "Could not disconnect GitHub"
      );
    }
    setBusy(null);
  }

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
          <Spinner className="size-4" />
          Loading integrations…
        </div>
        {extra}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Alert variant="error" className="md:col-span-2">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
        {extra}
      </div>
    );
  }

  const googleStatus = query.data.google;
  const githubStatus = query.data.github;

  const googleState = !googleStatus.available
    ? "unavailable"
    : googleStatus.connected
      ? "connected"
      : "disconnected";

  const githubState = !githubStatus.available
    ? "unavailable"
    : githubStatus.connected
      ? "connected"
      : "disconnected";

  const googleDescription =
    googleState === "unavailable"
      ? "Google sign-in is not configured on the server."
      : googleStatus.connected
        ? googleStatus.canDisconnect
          ? "Google is linked for sign-in."
          : "Google is your only sign-in method. Add another before disconnecting."
        : "Connect Google to sign in with your Google account.";

  const githubDescription =
    githubState === "unavailable"
      ? "GitHub OAuth is not configured on the server."
      : githubState === "connected"
        ? githubStatus.canDisconnect
          ? "OAuth granted. Portfolio, private repos, and stack detect use this connection."
          : "GitHub is your only sign-in method. Add another before disconnecting."
        : "Not linked. Connect to use portfolio GitHub features and private repo detect.";

  const githubAccess = formatGithubAccessSummary(githubStatus.scope);
  const githubTokenExpires = githubStatus.tokenExpiresAt
    ? new Date(githubStatus.tokenExpiresAt)
    : null;
  const githubTokenExpired = Boolean(
    // Token expiry is wall-clock; compare at render against the last query payload.
    // oxlint-disable-next-line react-hooks-js/purity -- expiry vs now
    githubTokenExpires && githubTokenExpires.getTime() < Date.now()
  );
  const githubTokenLabel = githubTokenExpired
    ? "Expired — reconnect"
    : githubTokenExpires
      ? `Valid until ${formatConnectionTime(githubTokenExpires)}`
      : githubStatus.lastRefreshedAt
        ? `Updated ${formatConnectionTime(githubStatus.lastRefreshedAt)}`
        : null;

  const connectGoogleState = busy === "google" ? "pending" : "idle";
  const connectGithubState = busy === "github" ? "pending" : "idle";
  const unlinkGoogleState = busy === "unlink-google" ? "pending" : "idle";
  const unlinkGithubState = busy === "unlink-github" ? "pending" : "idle";

  const googleActions =
    googleState === "unavailable" ? (
      <StatusSubmitButton
        size="sm"
        state="idle"
        idleVariant="outline"
        label="Not configured"
        disabled
      />
    ) : googleState === "disconnected" ? (
      <StatusSubmitButton
        size="sm"
        idleVariant="outline"
        state={connectGoogleState}
        label={connectGoogleState === "pending" ? "Redirecting…" : "Connect"}
        disabled={busy === "google"}
        onClick={() => {
          void connectGoogle();
        }}
      />
    ) : (
      <StatusSubmitButton
        size="sm"
        idleVariant="destructive-outline"
        state={unlinkGoogleState}
        label={unlinkGoogleState === "pending" ? "Disconnecting…" : "Disconnect"}
        disabled={busy === "unlink-google" || !googleStatus.canDisconnect}
        onClick={() => setDisconnectTarget("google")}
      />
    );

  const githubActions =
    githubState === "unavailable" ? (
      <StatusSubmitButton
        size="sm"
        state="idle"
        idleVariant="outline"
        label="Not configured"
        disabled
      />
    ) : githubState === "disconnected" ? (
      <StatusSubmitButton
        size="sm"
        idleVariant="outline"
        state={connectGithubState}
        label={connectGithubState === "pending" ? "Redirecting…" : "Connect"}
        disabled={busy === "github"}
        onClick={() => {
          void startGithubOAuth();
        }}
      />
    ) : (
      <>
        <StatusSubmitButton
          size="sm"
          idleVariant="outline"
          state={connectGithubState}
          label={
            connectGithubState === "pending"
              ? refreshGithub.isPending
                ? "Refreshing…"
                : "Redirecting…"
              : "Reconnect"
          }
          disabled={busy === "github"}
          icon={<RefreshCwIcon className="size-3.5" aria-hidden />}
          onClick={() => {
            void reconnectGithub();
          }}
        />
        <StatusSubmitButton
          size="sm"
          idleVariant="destructive-outline"
          state={unlinkGithubState}
          label={unlinkGithubState === "pending" ? "Disconnecting…" : "Disconnect"}
          disabled={busy === "unlink-github" || !githubStatus.canDisconnect}
          onClick={() => setDisconnectTarget("github")}
        />
      </>
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IntegrationCard
          title="Google"
          logo={
            <IntegrationBrandMark>
              <SiGoogle className="size-5" aria-hidden />
            </IntegrationBrandMark>
          }
          badge={<ConnectionStatusBadge state={googleState} />}
          description={googleDescription}
          actions={googleActions}
        />

        <IntegrationCard
          title="GitHub"
          logo={
            <IntegrationBrandMark>
              <SiGithub className="size-5 text-foreground" aria-hidden />
            </IntegrationBrandMark>
          }
          badge={<ConnectionStatusBadge state={githubState} />}
          description={githubDescription}
          meta={
            <IntegrationMeta
              rows={[
                githubStatus.username
                  ? { label: "Account", value: `@${githubStatus.username}` }
                  : null,
                githubAccess ? { label: "Access", value: githubAccess } : null,
                githubTokenLabel
                  ? {
                      label: "Token",
                      value: githubTokenLabel,
                      tone: githubTokenExpired ? "warning" : "default"
                    }
                  : null
              ]}
            />
          }
          actions={githubActions}
        />

        {extra}
      </div>

      <AlertDialog
        open={disconnectTarget != null}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disconnectTarget === "github" ? "Disconnect GitHub?" : "Disconnect Google?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget === "github"
                ? "Portfolio GitHub features will stop until you connect again. Existing public data already imported stays in place."
                : "You will no longer be able to sign in with Google until you connect again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "unlink-google" || busy === "unlink-github"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={busy === "unlink-google" || busy === "unlink-github"}
              icon={<UnplugIcon className="size-3.5" aria-hidden />}
              onClick={() => {
                if (!disconnectTarget) return;
                void disconnectProvider(disconnectTarget);
              }}
            >
              {disconnectTarget === "github" ? "Disconnect GitHub" : "Disconnect Google"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
