"use client";

import { FileTextIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

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
    <div className="flex w-full flex-col gap-5">
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

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
  );
}
