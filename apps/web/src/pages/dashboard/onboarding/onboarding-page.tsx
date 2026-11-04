"use client";

import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";

import { useGetAiSettingsQuery } from "@/features/ai-settings";
import {
  cancelExtractResumeJob,
  getOnboardingSessionState,
  readPersistedOnboardingStep,
  resetOnboardingSessionState,
  setOnboardingSessionState,
  startExtractResumeJob,
  useOnboardingSession,
  type OnboardingApplySummary,
  type OnboardingFlowStep
} from "@/features/onboarding";

import { AiStep } from "@/pages/dashboard/onboarding/ui/ai-step";
import { AnalyzingStep } from "@/pages/dashboard/onboarding/ui/analyzing-step";
import { ConnectStep } from "@/pages/dashboard/onboarding/ui/connect-step";
import { DoneStep } from "@/pages/dashboard/onboarding/ui/done-step";
import { JobsStep } from "@/pages/dashboard/onboarding/ui/jobs-step";
import { OnboardingShell } from "@/pages/dashboard/onboarding/ui/onboarding-shell";
import { ReviewStep } from "@/pages/dashboard/onboarding/ui/review-step";
import { UploadStep } from "@/pages/dashboard/onboarding/ui/upload-step";

const onboardingRoute = getRouteApi("/(root-layout)/__protected/dashboard/onboarding/");

const COPY: Record<OnboardingFlowStep, { title: string; description: React.ReactNode }> = {
  ai: {
    title: "Connect your AI",
    description:
      "One provider unlocks resume import, the hub assistant, and job matching. Your key stays sealed."
  },
  upload: {
    title: "Start from your resume",
    description: "About three minutes. We’ll draft your profile — you decide what to keep."
  },
  analyzing: {
    title: "Reading your resume",
    description:
      "This keeps running if you leave the page. You’ll get a toast when the draft is ready."
  },
  review: {
    title: "Review the draft",
    description: "Uncheck anything you don’t want. Expand a row only when you need to edit."
  },
  jobs: {
    title: "What jobs should we keep?",
    description: "These filters decide which email listings become New jobs."
  },
  connect: {
    title: "Connect the accounts you already use",
    description:
      "Optionally add your Resend credentials for Career Inbox. GitHub helps detect stacks from your repos."
  },
  done: {
    title: "You’re ready",
    description: "Refine anything later from the dashboard — nothing here is locked in."
  }
};

const RESTORE_STEPS: OnboardingFlowStep[] = ["ai", "jobs", "connect", "done"];

export function OnboardingPage() {
  const search = onboardingRoute.useSearch();
  const session = useOnboardingSession();
  const {
    step,
    objectKey,
    filename,
    draft,
    applySummary,
    extractStatus,
    extractStepLabel,
    extractError
  } = session;

  const settingsQuery = useGetAiSettingsQuery();
  const { aiConfigured } = session;

  useEffect(() => {
    const fromUrl = search.step;
    if (fromUrl && RESTORE_STEPS.includes(fromUrl) && fromUrl !== step) {
      setOnboardingSessionState({ step: fromUrl });
      return;
    }
    const persisted = readPersistedOnboardingStep();
    if (!fromUrl && persisted && RESTORE_STEPS.includes(persisted) && persisted !== step) {
      setOnboardingSessionState({ step: persisted });
    }
    // Only on mount / OAuth return — don't fight in-flow step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.step]);

  // A saved provider key (Settings → AI) satisfies the gated first step:
  // mark configured and skip past Connect AI on fresh entries.
  useEffect(() => {
    const hasKey = (settingsQuery.data?.providers ?? []).some((provider) => provider.hasApiKey);
    if (!hasKey || aiConfigured) return;
    const current = getOnboardingSessionState();
    setOnboardingSessionState(
      current.step === "ai" ? { aiConfigured: true, step: "upload" } : { aiConfigured: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconcile once per settings load
  }, [settingsQuery.data, aiConfigured]);

  const handleUploaded = useCallback((payload: { objectKey: string; filename: string }) => {
    setOnboardingSessionState({
      objectKey: payload.objectKey,
      filename: payload.filename,
      draft: null,
      extractStatus: "idle",
      extractError: null,
      extractStepLabel: null,
      extractRunId: null
    });
  }, []);

  const handleCleared = useCallback(() => {
    cancelExtractResumeJob();
    setOnboardingSessionState({
      objectKey: null,
      filename: null,
      draft: null,
      extractStatus: "idle",
      extractError: null,
      extractStepLabel: null,
      extractRunId: null
    });
  }, []);

  const handleAnalyze = useCallback(() => {
    startExtractResumeJob();
  }, []);

  const handleDraftChange = useCallback((next: ResumeImportDraft) => {
    setOnboardingSessionState({ draft: next });
  }, []);

  const handleApplySuccess = useCallback((summary: OnboardingApplySummary) => {
    setOnboardingSessionState({
      applySummary: summary,
      step: "jobs",
      draft: null,
      objectKey: null,
      filename: null,
      extractStatus: "idle",
      extractError: null,
      extractStepLabel: null,
      extractRunId: null
    });
  }, []);

  const handleSkippedResume = useCallback(() => {
    setOnboardingSessionState({
      step: "jobs",
      draft: null,
      objectKey: null,
      filename: null,
      extractStatus: "idle",
      extractError: null,
      extractStepLabel: null,
      extractRunId: null
    });
  }, []);

  const handleDiscardAndRestart = useCallback(() => {
    cancelExtractResumeJob();
    resetOnboardingSessionState();
  }, []);

  const handleBackToUpload = useCallback(() => {
    if (extractStatus === "running") {
      cancelExtractResumeJob();
      return;
    }
    setOnboardingSessionState({ step: "upload", extractError: null });
  }, [extractStatus]);

  const copy = COPY[step];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto p-4 sm:p-6 lg:p-8">
      <OnboardingShell step={step} title={copy.title} description={copy.description}>
        {step === "ai" ? (
          <AiStep
            onContinue={() => setOnboardingSessionState({ aiConfigured: true, step: "upload" })}
          />
        ) : null}

        {step === "upload" ? (
          <UploadStep
            aiConfigured={aiConfigured}
            onConnectAi={() => setOnboardingSessionState({ step: "ai" })}
            objectKey={objectKey}
            filename={filename}
            onUploaded={handleUploaded}
            onCleared={handleCleared}
            onAnalyze={handleAnalyze}
            onSkipped={handleSkippedResume}
          />
        ) : null}

        {step === "analyzing" && objectKey ? (
          <AnalyzingStep
            filename={filename}
            stepLabel={extractStepLabel}
            error={extractError}
            isRunning={extractStatus === "running"}
            onCancel={handleBackToUpload}
            onRetry={() => startExtractResumeJob({ objectKey, filename })}
            onBack={handleBackToUpload}
          />
        ) : null}

        {step === "review" && draft ? (
          <ReviewStep
            draft={draft}
            objectKey={objectKey}
            onDraftChange={handleDraftChange}
            onBack={() => setOnboardingSessionState({ step: "upload" })}
            onApplied={handleApplySuccess}
            onDiscarded={handleDiscardAndRestart}
          />
        ) : null}

        {step === "jobs" ? (
          <JobsStep
            onContinue={() => setOnboardingSessionState({ step: "connect" })}
            onBack={() => setOnboardingSessionState({ step: "upload" })}
          />
        ) : null}

        {step === "connect" ? (
          <ConnectStep
            onContinue={() => setOnboardingSessionState({ step: "done" })}
            onBack={() => setOnboardingSessionState({ step: "jobs" })}
          />
        ) : null}

        {step === "done" ? (
          <DoneStep
            summary={applySummary}
            skipped={!applySummary}
            aiConfigured={aiConfigured}
            onAiConfigured={() => setOnboardingSessionState({ aiConfigured: true })}
            onImportAnother={handleDiscardAndRestart}
          />
        ) : null}
      </OnboardingShell>
    </div>
  );
}
