"use client";

import { FileTextIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

import { useExtractResumeMutation } from "@/features/onboarding";

import { AnalyzingProgress } from "@/pages/dashboard/onboarding/ui/analyzing-progress";

export type AnalyzingStepProps = {
  objectKey: string;
  filename: string | null;
  onSuccess: (draft: ResumeImportDraft) => void;
  onBack: () => void;
};

export function AnalyzingStep({ objectKey, filename, onSuccess, onBack }: AnalyzingStepProps) {
  const extractMutation = useExtractResumeMutation();
  const [stepLabel, setStepLabel] = useState<string | null>("Starting analysis…");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void (async () => {
      try {
        const draft = await extractMutation.mutateAsync({
          objectKey,
          filename: filename ?? undefined,
          signal: controller.signal,
          onStepChange: (step) => {
            if (alive) setStepLabel(step);
          }
        });
        if (!alive || controller.signal.aborted) return;
        setIsRunning(false);
        onSuccessRef.current(draft);
      } catch (err) {
        if (!alive || controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to analyze resume");
        setStepLabel(null);
        setIsRunning(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
    // Mount once per source via parent `key={objectKey}` — do not reset state in effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectKey]);

  const handleRetry = () => {
    setError(null);
    setIsRunning(true);
    setStepLabel("Starting analysis…");
    const controller = new AbortController();
    void (async () => {
      try {
        const draft = await extractMutation.mutateAsync({
          objectKey,
          filename: filename ?? undefined,
          signal: controller.signal,
          onStepChange: setStepLabel
        });
        setIsRunning(false);
        onSuccessRef.current(draft);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to analyze resume");
        setStepLabel(null);
        setIsRunning(false);
      }
    })();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {filename ? (
        <p className="inline-flex max-w-full items-center gap-1.5 self-start text-xs text-muted-foreground">
          <FileTextIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{filename}</span>
        </p>
      ) : null}

      {error ? (
        <Alert variant="error" className="w-full" role="alert">
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <AnalyzingProgress stepLabel={stepLabel} isRunning={isRunning} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onBack}
          disabled={isRunning}
        >
          Back
        </Button>
        {error ? (
          <Button type="button" loading={extractMutation.isPending} onClick={handleRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
