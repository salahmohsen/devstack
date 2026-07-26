"use client";

import { useCallback, useState } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";

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
      "Upload a PDF. We’ll extract profile, experiences, projects, and stacks — you review everything before it’s saved."
  },
  analyzing: {
    title: "Analyzing resume",
    description: "This usually takes under a minute. Keep this tab open while we work."
  },
  review: {
    title: "Review before import",
    description:
      "Uncheck anything you don’t want. Portfolio visibility defaults on for selected items — flip the switch to keep something private."
  },
  done: {
    title: "You’re all set",
    description: "Your portfolio evidence is ready. Jump into any section to refine details."
  }
};

export function OnboardingPage() {
  const [step, setStep] = useState<OnboardingFlowStep>("upload");
  const [objectKey, setObjectKey] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResumeImportDraft | null>(null);
  const [applySummary, setApplySummary] = useState<{
    experiences: number;
    projects: number;
    stacks: number;
  } | null>(null);

  const handleUploaded = useCallback((payload: { objectKey: string; filename: string }) => {
    setObjectKey(payload.objectKey);
    setFilename(payload.filename);
  }, []);

  const handleCleared = useCallback(() => {
    setObjectKey(null);
    setFilename(null);
    setDraft(null);
  }, []);

  const handleExtractSuccess = useCallback((nextDraft: ResumeImportDraft) => {
    setDraft(nextDraft);
    setStep("review");
  }, []);

  const handleApplySuccess = useCallback(
    (summary: { experiences: number; projects: number; stacks: number }) => {
      setApplySummary(summary);
      setStep("done");
    },
    []
  );

  const handleSkipped = useCallback(() => {
    setApplySummary(null);
    setStep("done");
  }, []);

  const handleDiscardAndRestart = useCallback(() => {
    setDraft(null);
    setObjectKey(null);
    setFilename(null);
    setApplySummary(null);
    setStep("upload");
  }, []);

  const copy = COPY[step];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 lg:p-8">
      <OnboardingShell step={step} title={copy.title} description={copy.description}>
        {step === "upload" ? (
          <UploadStep
            objectKey={objectKey}
            filename={filename}
            onUploaded={handleUploaded}
            onCleared={handleCleared}
            onAnalyze={() => setStep("analyzing")}
            onSkipped={handleSkipped}
          />
        ) : null}

        {step === "analyzing" && objectKey ? (
          <AnalyzingStep
            objectKey={objectKey}
            filename={filename}
            onSuccess={handleExtractSuccess}
            onBack={() => setStep("upload")}
          />
        ) : null}

        {step === "review" && draft ? (
          <ReviewStep
            draft={draft}
            objectKey={objectKey}
            onDraftChange={setDraft}
            onBack={() => setStep("upload")}
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
