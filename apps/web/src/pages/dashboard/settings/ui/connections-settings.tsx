"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, Link2Icon, UnplugIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { GMAIL_CONNECT_SCOPES } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { primaryAppUrl } from "@/shared/lib/primary-app-url";

import {
  connectionsQueryKeys,
  useGetConnectionsStatusQuery,
  useSetGmailAutoSyncMutation,
  useSyncGmailMutation
} from "@/features/connections";

import { SettingsSection } from "./settings-section";

const connectionsRoute = getRouteApi("/(root-layout)/__protected/dashboard/settings/connections/");

const OAUTH_LINK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "That Google account is already linked to a different user.",
  unable_to_link_account: "Could not link this account. Try again or use a different Google login.",
  access_denied: "Google access was denied. No changes were made.",
  oauth_provider_not_found: "This provider is not configured on the server."
};

function StatusBadge({
  state
}: {
  state: "connected" | "partial" | "disconnected" | "unavailable";
}) {
  if (state === "connected") {
    return (
      <Badge variant="success" size="sm" className="gap-1">
        <CheckCircle2Icon className="size-3" aria-hidden />
        Connected
      </Badge>
    );
  }
  if (state === "partial") {
    return (
      <Badge variant="warning" size="sm">
        Sign-in only
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

export function ConnectionsSettings() {
  const query = useGetConnectionsStatusQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { error: oauthError, error_description: oauthErrorDescription } =
    connectionsRoute.useSearch();
  const syncGmail = useSyncGmailMutation();
  const setAutoSync = useSetGmailAutoSyncMutation();
  const [busy, setBusy] = useState<"google" | "github" | "unlink-google" | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  useEffect(() => {
    if (!oauthError) return;
    toast.error(
      OAUTH_LINK_ERROR_MESSAGES[oauthError] ??
        oauthErrorDescription ??
        `Could not connect account (${oauthError.replaceAll("_", " ")}).`
    );
    void navigate({
      to: "/dashboard/settings/connections",
      search: {},
      replace: true
    });
  }, [oauthError, oauthErrorDescription, navigate]);

  async function connectGmail() {
    setBusy("google");
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: primaryAppUrl("/dashboard/settings/connections"),
        errorCallbackURL: primaryAppUrl("/dashboard/settings/connections"),
        scopes: [...GMAIL_CONNECT_SCOPES]
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Google connect");
      setBusy(null);
    }
  }

  async function connectGithub() {
    setBusy("github");
    try {
      await authClient.linkSocial({
        provider: "github",
        callbackURL: primaryAppUrl("/dashboard/settings/connections"),
        errorCallbackURL: primaryAppUrl("/dashboard/settings/connections")
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start GitHub connect");
      setBusy(null);
    }
  }

  async function disconnectGoogle() {
    setBusy("unlink-google");
    try {
      const result = await authClient.unlinkAccount({ providerId: "google" });
      if (result.error) {
        throw new Error(result.error.message ?? "Unlink failed");
      }
      toast.success("Google disconnected");
      setDisconnectOpen(false);
      await queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Google");
    } finally {
      setBusy(null);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading connections…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle>Connections</FrameTitle>
          <FrameDescription>Could not load connection status.</FrameDescription>
        </FrameHeader>
      </Frame>
    );
  }

  const googleStatus = query.data.google;
  const githubStatus = query.data.github;

  const googleState = !googleStatus.available
    ? "unavailable"
    : googleStatus.gmailConnected
      ? "connected"
      : googleStatus.connected
        ? "partial"
        : "disconnected";

  const githubState = !githubStatus.available
    ? "unavailable"
    : githubStatus.connected
      ? "connected"
      : "disconnected";

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle className="flex items-center gap-2">
          <Link2Icon className="size-4 opacity-80" aria-hidden />
          Connections
        </FrameTitle>
        <FrameDescription>
          Link third-party accounts. Sign-in providers and data access (Gmail) are separate — grant
          only what Career Inbox needs.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="space-y-6">
        <SettingsSection
          title="Google"
          description="Use Google to sign in, then connect Gmail for Career Inbox sync (optional, separate scopes)."
        >
          <div
            className={cn(
              "flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            )}
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Gmail & Google</p>
                <StatusBadge state={googleState} />
              </div>
              <p className="text-xs text-muted-foreground">
                {googleState === "unavailable"
                  ? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server to enable."
                  : googleState === "connected"
                    ? "Gmail scopes granted. Sync pulls recent inbox into Career Inbox and runs classify."
                    : googleState === "partial"
                      ? "Google is linked for sign-in only. Connect Gmail to allow reading career mail."
                      : "Not linked. Connect Gmail to grant read + send scopes for Career Inbox."}
              </p>
              {query.data.gmailSync.emailAddress ? (
                <p className="text-xs text-muted-foreground">
                  Mailbox · {query.data.gmailSync.emailAddress}
                </p>
              ) : googleStatus.accountId ? (
                <p className="font-mono text-[11px] text-muted-foreground">
                  Account · {googleStatus.accountId.slice(0, 12)}…
                </p>
              ) : null}
              {query.data.gmailSync.lastSyncedAt ? (
                <p className="text-[11px] text-muted-foreground">
                  Last sync ·{" "}
                  {new Date(query.data.gmailSync.lastSyncedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                </p>
              ) : null}
              {query.data.gmailSync.lastError ? (
                <Alert variant="error" className="mt-1 py-2">
                  <AlertTitle className="text-xs">Last sync failed</AlertTitle>
                  <AlertDescription className="text-xs">
                    {query.data.gmailSync.lastError}
                  </AlertDescription>
                </Alert>
              ) : null}
              {googleStatus.gmailConnected ? (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="gmail-auto-sync"
                    checked={query.data.gmailSync.autoSyncEnabled}
                    disabled={setAutoSync.isPending}
                    onCheckedChange={(checked) => {
                      setAutoSync.mutate({ autoSyncEnabled: checked });
                    }}
                  />
                  <Label
                    htmlFor="gmail-auto-sync"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Auto-sync every ~15 minutes (History API)
                  </Label>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {googleStatus.available && !googleStatus.gmailConnected ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === "google"}
                  onClick={() => {
                    void connectGmail();
                  }}
                >
                  {busy === "google" ? "Redirecting…" : "Connect Gmail"}
                </Button>
              ) : null}
              {googleStatus.gmailConnected ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={syncGmail.isPending}
                  onClick={() => {
                    syncGmail.mutate({});
                  }}
                >
                  {syncGmail.isPending ? "Syncing…" : "Sync inbox"}
                </Button>
              ) : null}
              {googleStatus.connected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === "unlink-google"}
                  onClick={() => setDisconnectOpen(true)}
                >
                  <UnplugIcon className="size-3.5" aria-hidden />
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="GitHub"
          description="Powers public portfolio repos and private stack detection. Usually linked at sign-in."
        >
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">GitHub</p>
                <StatusBadge state={githubState} />
              </div>
              <p className="text-xs text-muted-foreground">
                {githubState === "unavailable"
                  ? "GitHub OAuth is not configured on the server."
                  : githubState === "connected"
                    ? "GitHub is linked to this account."
                    : "Not linked. Connect to use portfolio GitHub features."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {githubStatus.available && !githubStatus.connected ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === "github"}
                  onClick={() => {
                    void connectGithub();
                  }}
                >
                  {busy === "github" ? "Redirecting…" : "Connect GitHub"}
                </Button>
              ) : null}
            </div>
          </div>
        </SettingsSection>

        <p className="text-xs text-muted-foreground">
          Sessions and password live under{" "}
          <a href="/dashboard/settings/account" className="underline-offset-2 hover:underline">
            Account
          </a>
          . Resend inbound keys live under{" "}
          <a href="/dashboard/settings/mail" className="underline-offset-2 hover:underline">
            Mail
          </a>
          .
        </p>
      </FramePanel>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google?</AlertDialogTitle>
            <AlertDialogDescription>
              Gmail sync will stop and Career Inbox will no longer pull from this Google account
              until you connect again. Existing mail already imported stays in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busy === "unlink-google"}
              onClick={() => {
                void disconnectGoogle();
              }}
            >
              {busy === "unlink-google" ? "Disconnecting…" : "Disconnect Google"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Frame>
  );
}
