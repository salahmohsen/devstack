"use client";

import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { Button } from "@tsu-stack/ui/components/button";

import { ConnectionsIntegrations } from "@/features/connections";

const onboardingRoute = getRouteApi("/(root-layout)/__protected/dashboard/onboarding/");

export function ConnectStep({
  onContinue,
  onBack
}: {
  onContinue: () => void;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const { error: oauthError, error_description: oauthErrorDescription } =
    onboardingRoute.useSearch();

  const clearOauthError = useCallback(() => {
    void navigate({
      to: "/dashboard/onboarding",
      search: { step: "connect" },
      replace: true
    });
  }, [navigate]);

  return (
    <div className="flex flex-col gap-5">
      <ConnectionsIntegrations
        callbackPath="/dashboard/onboarding?step=connect"
        oauthError={oauthError}
        oauthErrorDescription={oauthErrorDescription}
        onClearOauthError={clearOauthError}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onBack}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
