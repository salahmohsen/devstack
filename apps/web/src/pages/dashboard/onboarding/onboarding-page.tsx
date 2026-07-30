"use client";

import { useCallback } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";

import {
  cancelExtractResumeJob,
  resetOnboardingSessionState,
  setOnboardingSessionState,
  startExtractResumeJob,
  useOnboardingSession
} from "@/features/onboarding";

import { AnalyzingStep } from "@/pages/dashboard/onboarding/ui/analyzing-step";
import { DoneStep } from "@/pages/dashboard/onboarding/ui/done-step";
import {
  type OnboardingFlowStep,
  OnboardingShell
} from "@/pages/dashboard/onboarding/ui/onboarding-shell";
import { ReviewStep } from "@/pages/dashboard/onboarding/ui/review-step";
import { UploadStep } from "@/pages/dashboard/onboarding/ui/upload-step";

const COPY: Record<OnboardingFlowStep, { title: string; description: React.ReactNode }> = {
  upload: {
    title: "Import from your resume",
    description:
      "We’ll draft profile, experiences, projects, and stacks. You review before anything is saved."
  },
  analyzing: {
    title: "Analyzing resume",
    description: "Analysis continues if you leave this page."
  },
  review: {
    title: "Review before import",
    description: "Scan the list, uncheck what you don’t want, expand a row only to edit."
  },
  done: {
    title: "You’re all set",
    description: "Jump into any section to refine details."
  }
};

export function OnboardingPage() {
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

  const handleApplySuccess = useCallback(
    (summary: { experiences: number; projects: number; stacks: number }) => {
      setOnboardingSessionState({
        applySummary: summary,
        step: "done",
        // Keep draft/source cleared so a later revisit doesn't re-show review
        draft: null,
        objectKey: null,
        filename: null,
        extractStatus: "idle",
        extractError: null,
        extractStepLabel: null,
        extractRunId: null
      });
    },
    []
  );

  const handleSkipped = useCallback(() => {
    setOnboardingSessionState({
      applySummary: null,
      step: "done",
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
        {step === "upload" ? (
          <UploadStep
            objectKey={objectKey}
            filename={filename}
            onUploaded={handleUploaded}
            onCleared={handleCleared}
            onAnalyze={handleAnalyze}
            onSkipped={handleSkipped}
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

        {step === "done" ? (
          <DoneStep
            summary={applySummary}
            skipped={!applySummary}
            onImportAnother={handleDiscardAndRestart}
          />
        ) : null}
      </OnboardingShell>
    </div>
  );
}
