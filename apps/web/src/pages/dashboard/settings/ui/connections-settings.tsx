"use client";

import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Blocks } from "lucide-react";
import { useCallback } from "react";

import { ConnectionsIntegrations } from "@/features/connections";

import { SettingsFrame } from "./settings-frame";

const connectionsRoute = getRouteApi("/(root-layout)/__protected/dashboard/settings/connections/");

const FRAME_DESCRIPTION =
  "Link Gmail and GitHub. Sign-in and inbox access are separate — grant only what Career Inbox needs.";

export function ConnectionsSettings() {
  const navigate = useNavigate();
  const { error: oauthError, error_description: oauthErrorDescription } =
    connectionsRoute.useSearch();

  const clearOauthError = useCallback(() => {
    void navigate({
      to: "/dashboard/settings/connections",
      search: {},
      replace: true
    });
  }, [navigate]);

  return (
    <SettingsFrame
      title="Integrations"
      icon={<Blocks className="size-4 opacity-80" aria-hidden />}
      description={FRAME_DESCRIPTION}
      contentClassName="space-y-6"
    >
      <ConnectionsIntegrations
        callbackPath="/dashboard/settings/connections"
        oauthError={oauthError}
        oauthErrorDescription={oauthErrorDescription}
        onClearOauthError={clearOauthError}
      />
      <p className="text-xs text-muted-foreground">
        Sessions and password live under{" "}
        <Link
          to="/dashboard/settings/account"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Account
        </Link>
        . Resend inbound keys live under{" "}
        <Link
          to="/dashboard/settings/mail"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Mail
        </Link>
        .
      </p>
    </SettingsFrame>
  );
}
