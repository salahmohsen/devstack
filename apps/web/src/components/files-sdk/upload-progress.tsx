"use client";

import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue
} from "@tsu-stack/ui/components/progress";
import { cn } from "@tsu-stack/ui/lib/utils";

export type FileUploadProgressStatus = "uploading" | "success" | "error";

export type FileUploadProgressState = {
  name: string;
  /** 0–100. Use `null` for indeterminate (no byte reports yet). */
  percent: number | null;
  status: FileUploadProgressStatus;
  errorMessage?: string;
};

export type FileUploadProgressProps = {
  upload: FileUploadProgressState;
  className?: string;
};

function StatusIcon({ status }: { status: FileUploadProgressStatus }) {
  if (status === "success") {
    return <CheckCircle2Icon className="size-4 shrink-0 text-primary" aria-hidden />;
  }
  if (status === "error") {
    return <XCircleIcon className="size-4 shrink-0 text-destructive" aria-hidden />;
  }
  return <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />;
}

function statusCopy(status: FileUploadProgressStatus): string {
  switch (status) {
    case "success":
      return "Uploaded";
    case "error":
      return "Failed";
    case "uploading":
      return "Uploading…";
  }
}

/**
 * Determinate upload bar using coss/Base UI Progress.
 * Drive `upload` from `files.upload(..., { onProgress })` — do not rely on
 * ambient `useFiles().uploads` alone (explicit-key PUT never sets success).
 *
 * @see https://files-sdk.dev/features/onprogress
 * @see https://base-ui.com/react/components/progress — value 0–max (default max 100); null = indeterminate
 */
export function FileUploadProgress({ upload, className }: FileUploadProgressProps) {
  const { name, percent, status, errorMessage } = upload;

  // Base UI: null → indeterminate; number → determinate (default max=100)
  const value =
    status === "success"
      ? 100
      : status === "error"
        ? (percent ?? 0)
        : percent === null
          ? null
          : Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("flex flex-col gap-1.5", className)} aria-live="polite">
      <Progress value={value} max={100}>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <ProgressLabel className="min-w-0 flex-1 truncate text-sm font-medium">
            {name}
          </ProgressLabel>
          <span className="shrink-0 text-xs text-muted-foreground">{statusCopy(status)}</span>
          {value != null ? (
            <ProgressValue className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {(formatted) =>
                formatted == null || formatted === "indeterminate" ? null : `${value}%`
              }
            </ProgressValue>
          ) : null}
        </div>
        <ProgressTrack
          className={cn(
            status === "error" && "bg-destructive/20",
            status === "success" && "bg-primary/15"
          )}
        >
          <ProgressIndicator
            className={cn(
              "rounded-full",
              status === "error" && "bg-destructive",
              status === "success" && "bg-primary"
            )}
          />
        </ProgressTrack>
      </Progress>
      {status === "error" && errorMessage ? (
        <p className="pl-6 text-xs text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
