"use client";

import { ClientOnly, Link } from "@tanstack/react-router";
import { FileUpIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useGetOnboardingStatusQuery, useSkipOnboardingMutation } from "@/features/onboarding";

import { AgentHubChat } from "@/widgets/agent-hub";

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
          Upload a PDF once — we extract profile, experiences, projects, and stacks. You review
          everything before it goes live.
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
      <ClientOnly
        fallback={
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Spinner className="size-5" />
            <span className="sr-only">Loading hub chat</span>
          </div>
        }
      >
        <AgentHubChat />
      </ClientOnly>
    </div>
  );
}
