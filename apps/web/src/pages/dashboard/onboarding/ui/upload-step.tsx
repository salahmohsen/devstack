"use client";

import { useFiles } from "files-sdk/react";
import { FileTextIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import {
  RESUME_SOURCE_KEY_PREFIX,
  RESUME_SOURCE_MAX_BYTES,
  RESUME_SOURCE_MIME
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDiscardSourceMutation, useSkipOnboardingMutation } from "@/features/onboarding";

import { UploadProgress } from "@/components/files-sdk/upload-progress";

export type UploadStepProps = {
  objectKey: string | null;
  filename: string | null;
  onUploaded: (payload: { objectKey: string; filename: string }) => void;
  onCleared: () => void;
  onAnalyze: () => void;
  onSkipped: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadStep({
  objectKey,
  filename,
  onUploaded,
  onCleared,
  onAnalyze,
  onSkipped
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropzoneId = useId();
  const files = useFiles({ endpoint: "/api/files" });
  const discardMutation = useDiscardSourceMutation();
  const skipMutation = useSkipOnboardingMutation();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const discardPrevious = useCallback(
    async (key: string | null) => {
      if (!key) return;
      try {
        await discardMutation.mutateAsync({ objectKey: key });
      } catch {
        // Best-effort: orphaned session PDFs are acceptable short-term.
      }
    },
    [discardMutation]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setLocalError(null);

      if (file.type !== RESUME_SOURCE_MIME && !file.name.toLowerCase().endsWith(".pdf")) {
        setLocalError("Only PDF resumes are supported.");
        return;
      }

      if (file.size > RESUME_SOURCE_MAX_BYTES) {
        setLocalError(
          `File is too large (${formatBytes(file.size)}). Max size is ${formatBytes(RESUME_SOURCE_MAX_BYTES)}.`
        );
        return;
      }

      const previousKey = objectKey;
      const key = `${RESUME_SOURCE_KEY_PREFIX}${crypto.randomUUID()}.pdf`;

      try {
        const result = await files.upload(key, file, {
          contentType: RESUME_SOURCE_MIME
        });
        await discardPrevious(previousKey);
        onUploaded({ objectKey: result.key, filename: file.name });
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Upload failed");
      }
    },
    [discardPrevious, files, objectKey, onUploaded]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleRemove = async () => {
    setLocalError(null);
    await discardPrevious(objectKey);
    onCleared();
    files.reset();
  };

  const handleSkip = async () => {
    setLocalError(null);
    try {
      await skipMutation.mutateAsync({
        objectKey: objectKey ?? undefined
      });
      onSkipped();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to skip onboarding");
    }
  };

  const isBusy = files.isUploading || discardMutation.isPending || skipMutation.isPending;
  const errorMessage = localError ?? files.error?.message ?? null;

  return (
    <Card className="w-full border-border/80 shadow-xs/5">
      <CardHeader className="gap-1 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base sm:text-lg">Resume PDF</CardTitle>
          <Badge variant="secondary" className="font-normal">
            Required for analysis
          </Badge>
        </div>
        <CardDescription>
          Drag and drop or choose a file. Nothing is written to your portfolio until you confirm on
          the review step.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-5">
        <div
          id={dropzoneId}
          role="button"
          tabIndex={0}
          aria-label="Upload resume PDF"
          aria-disabled={isBusy}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-[border-color,background-color,box-shadow] duration-200 ease-out outline-none motion-reduce:transition-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            isDragging
              ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px] shadow-primary/20"
              : "border-border bg-muted/20 hover:border-muted-foreground/35 hover:bg-muted/30",
            isBusy && "pointer-events-none opacity-70"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            if (!isBusy) inputRef.current?.click();
          }}
        >
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl border bg-background shadow-xs transition-transform duration-200 motion-reduce:transition-none",
              isDragging ? "scale-105 border-primary/40" : "border-border group-hover:scale-[1.02]"
            )}
          >
            <UploadCloudIcon
              className={cn("size-6", isDragging ? "text-primary" : "text-muted-foreground")}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop PDF to upload" : "Drop a PDF here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF only · up to {formatBytes(RESUME_SOURCE_MAX_BYTES)}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={RESUME_SOURCE_MIME}
            className="hidden"
            onChange={handleInputChange}
            disabled={isBusy}
            aria-labelledby={dropzoneId}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            loading={files.isUploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {objectKey ? "Replace PDF" : "Choose PDF"}
          </Button>
        </div>

        <UploadProgress files={files} />

        {objectKey && filename ? (
          <div
            className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
            role="status"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{filename}</p>
              <p className="truncate text-xs text-muted-foreground">Ready to analyze</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove uploaded resume"
              disabled={isBusy}
              onClick={() => void handleRemove()}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <Alert variant="error" role="alert">
            <AlertTitle>Upload issue</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          loading={skipMutation.isPending}
          onClick={() => void handleSkip()}
        >
          Skip for now
        </Button>
        <Button type="button" disabled={!objectKey || isBusy} onClick={onAnalyze}>
          Analyze resume
        </Button>
      </CardFooter>
    </Card>
  );
}
