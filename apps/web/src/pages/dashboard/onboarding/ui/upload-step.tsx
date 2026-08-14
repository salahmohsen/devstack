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
import { Button } from "@tsu-stack/ui/components/button";
import { Frame } from "@tsu-stack/ui/components/frame";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDiscardSourceMutation } from "@/features/onboarding";

import {
  FileUploadProgress,
  type FileUploadProgressState
} from "@/components/files-sdk/upload-progress";

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
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb % 1 === 0 ? kb : kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`;
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
  const fileInputId = useId();
  const readyStatusId = useId();
  const files = useFiles({ endpoint: "/api/files" });
  const discardMutation = useDiscardSourceMutation();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Local UI progress — do not rely on ambient `files.uploads` for success/error. */
  const [uploadUi, setUploadUi] = useState<FileUploadProgressState | null>(null);

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

      setUploadUi({ name: file.name, percent: null, status: "uploading" });

      try {
        const result = await files.upload(key, file, {
          contentType: RESUME_SOURCE_MIME,
          onProgress: (aggregate, perFile) => {
            const fileState = perFile[0];
            const loaded = fileState?.loaded ?? aggregate.loaded;
            const total =
              fileState && fileState.total > 0
                ? fileState.total
                : aggregate.total > 0
                  ? aggregate.total
                  : file.size;
            const percent =
              total > 0 ? Math.min(100, Math.max(0, Math.round((loaded / total) * 100))) : null;

            setUploadUi({
              name: file.name,
              percent: loaded > 0 ? percent : null,
              status: "uploading"
            });
          }
        });

        setUploadUi({ name: file.name, percent: 100, status: "success" });
        await discardPrevious(previousKey);
        onUploaded({ objectKey: result.key, filename: file.name });
        files.reset();
        window.setTimeout(() => setUploadUi(null), 600);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setLocalError(message);
        setUploadUi((prev) => {
          return {
            name: prev?.name ?? file.name,
            percent: prev?.percent ?? 0,
            status: "error",
            errorMessage: message
          };
        });
      }
    },
    [discardPrevious, files, objectKey, onUploaded]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleRemove = async () => {
    setLocalError(null);
    setUploadUi(null);
    await discardPrevious(objectKey);
    onCleared();
    files.reset();
  };

  const handleSkip = async () => {
    setLocalError(null);
    await discardPrevious(objectKey);
    onSkipped();
  };

  const isBusy = uploadUi?.status === "uploading" || files.isUploading || discardMutation.isPending;
  const errorMessage = localError ?? files.error?.message ?? null;
  const hasFile = Boolean(objectKey && filename);
  const showReady = hasFile && uploadUi?.status !== "uploading";

  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      {!showReady ? (
        <Frame>
          <div
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-10 text-center transition-[border-color,background-color] duration-150 motion-reduce:transition-none",
              "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/80 bg-muted/15 hover:border-muted-foreground/30 hover:bg-muted/25",
              isBusy ? "pointer-events-none opacity-70" : "cursor-pointer"
            )}
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
          >
            <div
              className={cn(
                "pointer-events-none flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border/70",
                isDragging && "text-primary ring-primary/30"
              )}
            >
              <UploadCloudIcon className="size-5" aria-hidden />
            </div>
            <div className="pointer-events-none space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop to upload" : "Drop your resume here"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF · up to {formatBytes(RESUME_SOURCE_MAX_BYTES)} ·{" "}
                <span className="text-foreground underline-offset-2 group-hover:underline">
                  browse
                </span>
              </p>
            </div>
            <input
              ref={inputRef}
              id={fileInputId}
              type="file"
              accept={RESUME_SOURCE_MIME}
              aria-label="Upload resume PDF"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={handleInputChange}
              disabled={isBusy}
            />
          </div>
        </Frame>
      ) : null}

      {uploadUi ? <FileUploadProgress upload={uploadUi} /> : null}

      {/* Ready file — single compact row, not a second card */}
      {showReady ? (
        <output
          id={readyStatusId}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground ring-1 ring-border/70">
            <FileTextIcon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate text-sm font-medium">{filename}</p>
            <p className="text-xs text-muted-foreground">Ready to analyze</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove uploaded resume"
            disabled={isBusy}
            onClick={() => void handleRemove()}
          >
            <Trash2Icon className="size-4" aria-hidden />
          </Button>
        </output>
      ) : null}

      {errorMessage ? (
        <Alert variant="error" role="alert">
          <AlertTitle>Upload issue</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Actions: one primary path depending on state */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={isBusy}
          onClick={() => void handleSkip()}
        >
          Skip resume
        </Button>

        {showReady ? (
          <Button
            type="button"
            disabled={isBusy}
            onClick={onAnalyze}
            aria-describedby={readyStatusId}
          >
            Analyze resume
          </Button>
        ) : null}
      </div>
    </div>
  );
}
