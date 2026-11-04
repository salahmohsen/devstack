"use client";

import { ClientOnly, Link } from "@tanstack/react-router";
import { FileUpIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

import { useGetOnboardingStatusQuery, useSkipOnboardingMutation } from "@/features/onboarding";

import { AgentHubChat } from "@/widgets/agent-hub";

/** SSR/first-paint stand-in so LCP is the welcome heading, not a spinner. */
function HubChatPaintShell() {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-1 flex-col items-center px-4 pt-10 text-center">
      <h1 className="text-2xl font-semibold">Welcome back. What can I do for you?</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ask about projects, detect stacks, organize your library, or plan the next move.
      </p>
    </div>
  );
}

function OnboardingSoftCta() {
  const statusQuery = useGetOnboardingStatusQuery();
  const skipMutation = useSkipOnboardingMutation();

  if (statusQuery.isLoading || statusQuery.isError) {
    return null;
  }

  if (statusQuery.data?.onboardingCompletedAt != null) {
    return null;
  }

  return (
    <Alert variant="info" className="shrink-0 rounded-none border-x-0 border-t-0 bg-primary/4">
      <FileUpIcon />
      <AlertTitle>Set up your portfolio from a resume</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="max-w-2xl text-pretty">
          Upload a PDF, set what jobs you want, and optionally connect Resend. You review everything
          before it goes live.
        </span>
        <span className="flex shrink-0 flex-wrap gap-2" data-slot="alert-action">
          <Button size="sm" render={<Link to="/dashboard/onboarding" />}>
            Set up from resume
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={skipMutation.isPending}
            onClick={() => void skipMutation.mutateAsync({})}
          >
            Skip for now
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

export function AgentHubPage() {
  return (
    // size-full + overflow-hidden: fill the dashboard ScrollArea content
    // box and keep a single scroll owner (the Thread viewport).
    <div className="flex size-full min-h-0 flex-1 flex-col overflow-hidden">
      <ClientOnly fallback={null}>
        <OnboardingSoftCta />
      </ClientOnly>
      <ClientOnly fallback={<HubChatPaintShell />}>
        <AgentHubChat />
      </ClientOnly>
    </div>
  );
}
