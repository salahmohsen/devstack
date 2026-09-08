"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { ConnectAiCard, useGetAiSettingsQuery } from "@/features/ai-settings";

export type AiStepProps = {
  /** Continue to the resume step after a provider is configured. */
  onContinue: () => void;
};

/**
 * Step 1 — Connect AI (gated). A provider probe must pass before Continue
 * unlocks; "I'll do this later" exits to the dashboard with honest copy and
 * the flow stays resumable.
 */
export function AiStep({ onContinue }: AiStepProps) {
  const settings = useGetAiSettingsQuery();

  if (settings.isLoading) {
    return (
      <div className="flex w-full items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Spinner className="size-4" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <ConnectAiCard
        providers={settings.data?.providers ?? []}
        continueLabel="Save and continue"
        onConfigured={onContinue}
        footer={
          <Button
            render={<Link to="/dashboard/agent" />}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <ArrowLeftIcon aria-hidden />
            I’ll do this later
          </Button>
        }
      />
      <p className="max-w-xl text-xs text-muted-foreground">
        Resume import, the hub assistant, and job matching stay off until you connect a provider.
      </p>
    </div>
  );
}
