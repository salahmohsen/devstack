"use client";

import { FileTextIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

import { ResumeDocPreview } from "@/shared/resume-doc-preview/resume-doc-preview";
import { AiErrorBanner } from "@/shared/ui/ai-error-banner";

import { AnalyzingProgress } from "@/pages/dashboard/onboarding/ui/analyzing-progress";

export type AnalyzingStepProps = {
  filename: string | null;
  stepLabel: string | null;
  error: string | null;
  isRunning: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onBack: () => void;
};

/**
 * Presentational analyzing UI. Extract work is owned by the detached job
 * (`startExtractResumeJob`) so leaving the route does not abort analysis.
 */
export function AnalyzingStep({
  filename,
  stepLabel,
  error,
  isRunning,
  onCancel,
  onRetry,
  onBack
}: AnalyzingStepProps) {
  return (
    // Mirrors the review layout (paper left, rail-like column right) so the
    // skeleton paper morphs into the real document in the same position.
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      {/* Document-first: sections materialize with an extracting skeleton while
          step labels stream — the doc fills in at Review. */}
      <div className="hidden lg:sticky lg:top-6 lg:block">
        <ResumeDocPreview
          skeleton
          className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        />
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4">
          {filename ? (
            <p className="inline-flex max-w-full items-center gap-1.5 self-start text-xs text-muted-foreground">
              <FileTextIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{filename}</span>
            </p>
          ) : null}

          {error ? (
            <AiErrorBanner message={error} feature="resume" severity="hard" onRetry={onRetry} />
          ) : (
            <AnalyzingProgress stepLabel={stepLabel} isRunning={isRunning} />
          )}

          {!error && isRunning ? (
            <p className="text-xs text-muted-foreground">
              You will be notified when the draft is ready.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
