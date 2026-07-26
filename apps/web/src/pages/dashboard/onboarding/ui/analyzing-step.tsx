"use client";

import { FileTextIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ResumeImportDraft } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";

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
  const [stepLabel, setStepLabel] = useState<string | null>("Initializing");
  const [error, setError] = useState<string | null>(null);
  const startedForKey = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runExtract = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setStepLabel("Initializing");

    try {
      const draft = await extractMutation.mutateAsync({
        objectKey,
        filename: filename ?? undefined,
        signal: controller.signal,
        onStepChange: (step) => setStepLabel(step)
      });
      if (!controller.signal.aborted) {
        onSuccess(draft);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
      setStepLabel(null);
    }
  };

  useEffect(() => {
    if (startedForKey.current === objectKey) return;
    startedForKey.current = objectKey;
    void runExtract();

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when objectKey changes
  }, [objectKey]);

  const isRunning = extractMutation.isPending && !error;

  return (
    <Card className="mx-auto w-full max-w-lg border-border/80 shadow-xs/5">
      <CardHeader className="gap-1 border-b border-border/60 pb-4">
        <CardTitle className="text-base sm:text-lg">Working through your resume</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {filename ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-foreground">
              <FileTextIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{filename}</span>
            </span>
          ) : (
            "Extracting profile, experiences, projects, and skills"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 py-6">
        {error ? (
          <Alert variant="error" className="w-full" role="alert">
            <AlertTitle>Analysis failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <AnalyzingProgress stepLabel={stepLabel} isRunning={isRunning} />
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isRunning}>
          Back
        </Button>
        {error ? (
          <Button
            type="button"
            loading={extractMutation.isPending}
            onClick={() => {
              startedForKey.current = null;
              void runExtract();
            }}
          >
            Retry analysis
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
