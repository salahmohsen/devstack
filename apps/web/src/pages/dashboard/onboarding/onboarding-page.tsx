"use client";

import { useCallback, useState } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";

import { AnalyzingStep } from "@/pages/dashboard/onboarding/ui/analyzing-step";
import { DoneStep } from "@/pages/dashboard/onboarding/ui/done-step";
import { ReviewStep } from "@/pages/dashboard/onboarding/ui/review-step";
import { UploadStep } from "@/pages/dashboard/onboarding/ui/upload-step";

type OnboardingStep = "upload" | "analyzing" | "review" | "done";

export function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("upload");
  const [objectKey, setObjectKey] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResumeImportDraft | null>(null);

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

  const handleApplySuccess = useCallback(() => {
    setStep("done");
  }, []);

  const handleSkipped = useCallback(() => {
    setStep("done");
  }, []);

  const handleDiscardAndRestart = useCallback(() => {
    setDraft(null);
    setObjectKey(null);
    setFilename(null);
    setStep("upload");
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
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

      {step === "done" ? <DoneStep /> : null}
    </div>
  );
}
