"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, RefreshCwIcon, UnplugIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { SiGithub, SiGmail } from "react-icons/si";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { formatGithubAccessSummary, GMAIL_CONNECT_SCOPES } from "@tsu-stack/core";
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
import { Card } from "@tsu-stack/ui/components/card";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { primaryAppUrl } from "@/shared/lib/primary-app-url";

import {
  connectionsQueryKeys,
  useGetConnectionsStatusQuery
} from "@/features/connections/api/get-connections-status.query";
import { useRefreshGithubMutation } from "@/features/connections/api/refresh-github.mutation";
import { useSetGmailAutoSyncMutation } from "@/features/connections/api/set-gmail-auto-sync.mutation";
import { useSyncGmailMutation } from "@/features/connections/api/sync-gmail.mutation";

const OAUTH_LINK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "That Google account is already linked to a different user.",
  unable_to_link_account: "Could not link this account. Try again or use a different Google login.",
  access_denied: "Google access was denied. No changes were made.",
  oauth_provider_not_found: "This provider is not configured on the server."
};

const FLASH_HOLD_MS = 800;

function useActionFlash() {
  const [flash, setFlash] = useState<"success" | "failed" | null>(null);
  useEffect(() => {
    if (flash !== "success") return;
    const timer = window.setTimeout(() => setFlash(null), FLASH_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);
  return { flash, setFlash };
}

function flashState(pending: boolean, flash: "success" | "failed" | null): StatusSubmitVisual {
  if (pending) return "pending";
  if (flash === "failed") return "failed";
  if (flash === "success") return "success";
  return "idle";
}

function ConnectionStatusBadge({
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

function formatConnectionTime(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function ConnectionMeta({
  rows
}: {
  rows: Array<{ label: string; value: string; tone?: "default" | "warning" } | null | undefined>;
}) {
  const visible = rows.filter(
    (row): row is { label: string; value: string; tone?: "default" | "warning" } =>
      Boolean(row?.value.trim())
  );
  if (visible.length === 0) return null;

  return (
    <dl className="space-y-1">
      {visible.map((row) => (
        <div key={row.label} className="flex min-w-0 items-baseline gap-1.5 text-xs">
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <span className="shrink-0 text-muted-foreground/70" aria-hidden>
            ·
          </span>
          <dd
            className={cn(
              "min-w-0 truncate",
              row.tone === "warning" ? "text-warning-foreground" : "text-foreground"
            )}
            title={row.value}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BrandMark({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-background",
        "shadow-[0_0_0_1px_oklch(0_0_0/0.1)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]"
      )}
    >
      {children}
    </div>
  );
}

function IntegrationCard({
  title,
  logo,
  badge,
  description,
  meta,
  extra,
  toggle,
  actions
}: {
  title: string;
  logo: ReactNode;
  badge: ReactNode;
  description: string;
  meta?: ReactNode;
  extra?: ReactNode;
  toggle?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          {logo}
          {badge}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-tight text-pretty">{title}</h3>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>
        </div>
        {meta}
        {extra}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <div className="flex min-h-7 min-w-10 items-center">{toggle}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      </div>
    </Card>
  );
}

export function ConnectionsIntegrations({
  callbackPath,
  oauthError,
  oauthErrorDescription,
  onClearOauthError
}: {
  /** Path Better Auth returns to after link (include search if needed). */
  callbackPath: string;
  oauthError?: string;
  oauthErrorDescription?: string;
  onClearOauthError?: () => void;
}) {
  const query = useGetConnectionsStatusQuery();
  const queryClient = useQueryClient();
  const syncGmail = useSyncGmailMutation();
  const setAutoSync = useSetGmailAutoSyncMutation();
  const refreshGithub = useRefreshGithubMutation();
  const [busy, setBusy] = useState<"google" | "github" | "unlink-google" | "unlink-github" | null>(
    null
  );
  const [disconnectTarget, setDisconnectTarget] = useState<"google" | "github" | null>(null);
  const gmailSyncFlash = useActionFlash();

  useEffect(() => {
    if (!oauthError) return;
    toast.error(
      OAUTH_LINK_ERROR_MESSAGES[oauthError] ??
        oauthErrorDescription ??
        `Could not connect account (${oauthError.replaceAll("_", " ")}).`
    );
    onClearOauthError?.();
  }, [oauthError, oauthErrorDescription, onClearOauthError]);

  async function connectGmail() {
    setBusy("google");
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: primaryAppUrl(callbackPath),
        errorCallbackURL: primaryAppUrl(callbackPath),
        scopes: [...GMAIL_CONNECT_SCOPES]
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
      const result = await authClient.unlinkAccount({ providerId: provider });
      if (result.error) {
        toast.error(result.error.message ?? "Unlink failed");
      } else {
        toast.success(provider === "google" ? "Google disconnected" : "GitHub disconnected");
        setDisconnectTarget(null);
        await queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() });
      }
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading integrations…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="error">
        <AlertTitle>Failed to load</AlertTitle>
        <AlertDescription>Refresh the page or try again later.</AlertDescription>
      </Alert>
    );
  }

  const googleStatus = query.data.google;
  const githubStatus = query.data.github;
  const gmailSync = query.data.gmailSync;

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

  const googleDescription =
    googleState === "unavailable"
      ? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server to enable."
      : googleState === "connected"
        ? "Gmail scopes granted. Sync pulls recent inbox into Career Inbox and runs classify."
        : googleState === "partial"
          ? "Google is linked for sign-in only. Connect Gmail to allow reading career mail."
          : "Not linked. Connect Gmail to grant read + send scopes for Career Inbox.";

  const githubDescription =
    githubState === "unavailable"
      ? "GitHub OAuth is not configured on the server."
      : githubState === "connected"
        ? "OAuth granted. Portfolio, private repos, and stack detect use this connection."
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

  const gmailSyncState = flashState(syncGmail.isPending, gmailSyncFlash.flash);
  const connectGoogleState = flashState(busy === "google", null);
  const connectGithubState = flashState(busy === "github", null);
  const unlinkGoogleState = flashState(busy === "unlink-google", null);
  const unlinkGithubState = flashState(busy === "unlink-github", null);

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
          void connectGmail();
        }}
      />
    ) : (
      <>
        {googleStatus.gmailConnected ? (
          <StatusSubmitButton
            size="sm"
            idleVariant="outline"
            state={gmailSyncState}
            label={
              gmailSyncState === "pending"
                ? "Syncing…"
                : gmailSyncState === "success"
                  ? "Synced"
                  : gmailSyncState === "failed"
                    ? "Failed"
                    : "Sync"
            }
            disabled={syncGmail.isPending || gmailSyncState === "success"}
            icon={<RefreshCwIcon className="size-3.5" aria-hidden />}
            onClick={() => {
              gmailSyncFlash.setFlash(null);
              syncGmail.mutate(
                {},
                {
                  onSuccess: () => gmailSyncFlash.setFlash("success"),
                  onError: () => gmailSyncFlash.setFlash("failed")
                }
              );
            }}
          />
        ) : (
          <StatusSubmitButton
            size="sm"
            idleVariant="outline"
            state={connectGoogleState}
            label={connectGoogleState === "pending" ? "Redirecting…" : "Connect Gmail"}
            disabled={busy === "google"}
            onClick={() => {
              void connectGmail();
            }}
          />
        )}
        <StatusSubmitButton
          size="sm"
          idleVariant="destructive-outline"
          state={unlinkGoogleState}
          label={unlinkGoogleState === "pending" ? "Disconnecting…" : "Disconnect"}
          disabled={busy === "unlink-google"}
          onClick={() => setDisconnectTarget("google")}
        />
      </>
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
          disabled={busy === "unlink-github"}
          onClick={() => setDisconnectTarget("github")}
        />
      </>
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IntegrationCard
          title="Gmail"
          logo={
            <BrandMark>
              <SiGmail className="size-5 text-[#EA4335]" aria-hidden />
            </BrandMark>
          }
          badge={<ConnectionStatusBadge state={googleState} />}
          description={googleDescription}
          meta={
            <>
              <ConnectionMeta
                rows={[
                  gmailSync.emailAddress
                    ? { label: "Mailbox", value: gmailSync.emailAddress }
                    : googleStatus.accountId
                      ? { label: "Account", value: `${googleStatus.accountId.slice(0, 12)}…` }
                      : null,
                  gmailSync.lastSyncedAt
                    ? {
                        label: "Last sync",
                        value: formatConnectionTime(gmailSync.lastSyncedAt)
                      }
                    : null
                ]}
              />
              {gmailSync.lastError ? (
                <Alert variant="error" className="mt-1 py-2">
                  <AlertTitle className="text-xs">Last sync failed</AlertTitle>
                  <AlertDescription className="text-xs">{gmailSync.lastError}</AlertDescription>
                </Alert>
              ) : null}
            </>
          }
          toggle={
            googleStatus.gmailConnected ? (
              <Switch
                id="gmail-auto-sync"
                checked={gmailSync.autoSyncEnabled}
                disabled={setAutoSync.isPending}
                onCheckedChange={(checked) => {
                  setAutoSync.mutate({ autoSyncEnabled: checked });
                }}
                aria-label="Auto-sync Gmail every 15 minutes"
                title="Auto-sync every ~15 minutes"
              />
            ) : null
          }
          actions={googleActions}
        />

        <IntegrationCard
          title="GitHub"
          logo={
            <BrandMark>
              <SiGithub className="size-5 text-foreground" aria-hidden />
            </BrandMark>
          }
          badge={<ConnectionStatusBadge state={githubState} />}
          description={githubDescription}
          meta={
            <ConnectionMeta
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
                : "Gmail sync will stop and Career Inbox will no longer pull from this Google account until you connect again. Existing mail already imported stays in place."}
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
