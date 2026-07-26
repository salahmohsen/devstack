"use client";

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
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useExtractResumeMutation } from "@/features/onboarding";

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
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Analyzing resume</CardTitle>
        <CardDescription>
          Extracting profile, experiences, projects, and skills
          {filename ? (
            <>
              {" "}
              from <span className="font-medium text-foreground">{filename}</span>
            </>
          ) : null}
          .
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 py-8">
        {isRunning ? (
          <>
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">{stepLabel ?? "Working…"}</p>
          </>
        ) : null}

        {error ? (
          <Alert variant="error" className="w-full">
            <AlertTitle>Analysis failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-2">
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
            Retry
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
