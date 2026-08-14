"use client";

import { useFiles } from "files-sdk/react";
import { CircleAlertIcon, Loader2Icon, UserIcon, XIcon, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AVATAR_KEY_PREFIX, extractAvatarClientKey } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview
} from "@tsu-stack/ui/hooks/use-file-upload";
import { cn } from "@tsu-stack/ui/lib/utils";

const DEFAULT_MAX_SIZE = 2 * 1024 * 1024; // 2MB

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function normalizeAvatarUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export type ProfileAvatarUploadProps = {
  maxSize?: number;
  className?: string;
  id?: string;
  /** Current saved avatar URL (session / profile). Empty string treated as none. */
  defaultAvatar?: string | null;
  /** Called with the public URL after a successful upload, or null when cleared. */
  onAvatarUrlChange: (url: string | null) => void | Promise<void>;
  disabled?: boolean;
  /** Circle for profile photos; rounded square for project logos. */
  shape?: "circle" | "rounded";
  /** Centered stack (profile) or start-aligned (form fields). */
  align?: "center" | "start";
  emptyIcon?: LucideIcon;
  labels?: {
    empty?: string;
    change?: string;
    uploading?: string;
    ariaUpload?: string;
    ariaRemove?: string;
    persistError?: string;
    uploadError?: string;
  };
  /**
   * Delete the previous `avatars/` object after a successful replace/clear.
   * Keep true for immediate-persist surfaces (profile). Forms that save later
   * should pass false so discarding an edit does not delete the live image.
   */
  deletePreviousOnChange?: boolean;
};

/**
 * Public-image dropzone (profile photo / project logo) via files-sdk `/api/files`.
 * Writes `{userId}/avatars/{uuid}.ext` so MinIO and `/api/media` can serve it.
 */
export function ProfileAvatarUpload({
  maxSize = DEFAULT_MAX_SIZE,
  className,
  id,
  defaultAvatar,
  onAvatarUrlChange,
  disabled = false,
  shape = "circle",
  align = "center",
  emptyIcon: EmptyIcon = UserIcon,
  labels,
  deletePreviousOnChange = true
}: ProfileAvatarUploadProps) {
  const filesApi = useFiles({ endpoint: "/api/files" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /**
   * After X, hide server `defaultAvatar` until parent re-renders with a cleared URL.
   * Without this, clearing local files still falls back to the stale session image.
   */
  const [suppressDefault, setSuppressDefault] = useState(false);
  const savedAvatar = normalizeAvatarUrl(defaultAvatar);
  const skipNextEmptyFilesChange = useRef(false);

  const persistErrorFallback = labels?.persistError ?? "Could not update profile photo";
  const uploadErrorFallback = labels?.uploadError ?? "Could not upload profile photo";

  useEffect(() => {
    if (savedAvatar) setSuppressDefault(false);
  }, [savedAvatar]);

  const persistAvatar = useCallback(
    async (url: string | null) => {
      setUploadError(null);
      try {
        await onAvatarUrlChange(url);
      } catch (error) {
        const message = error instanceof Error ? error.message : persistErrorFallback;
        setUploadError(message);
        toast.error(message);
        // Roll back optimistic hide if server clear failed.
        if (url === null) setSuppressDefault(false);
        throw error;
      }
    },
    [onAvatarUrlChange, persistErrorFallback]
  );

  /** Best-effort remove prior S3 object after a successful replace/clear (ignore failures). */
  const deletePreviousObject = useCallback(
    async (previousUrl: string | null | undefined) => {
      const clientKey = extractAvatarClientKey(previousUrl);
      if (!clientKey) return;
      try {
        await filesApi.delete(clientKey);
      } catch {
        // Orphans are acceptable; do not block the new avatar.
      }
    },
    [filesApi]
  );

  const uploadSelected = useCallback(
    async (entry: FileWithPreview | null) => {
      setUploadError(null);
      if (!entry) {
        // removeFile / clearFiles also fire onFilesChange([]) — may already be handled by X.
        if (skipNextEmptyFilesChange.current) {
          skipNextEmptyFilesChange.current = false;
          return;
        }
        setSuppressDefault(true);
        const previous = savedAvatar;
        await persistAvatar(null);
        if (deletePreviousOnChange) void deletePreviousObject(previous);
        return;
      }
      const raw = entry.file;
      if (!(raw instanceof File)) {
        // Metadata-only entry (restored preview) — no re-upload.
        return;
      }
      setSuppressDefault(false);
      setUploading(true);
      const previous = savedAvatar;
      try {
        const ext = extensionForFile(raw);
        const key = `${AVATAR_KEY_PREFIX}${crypto.randomUUID()}.${ext}`;
        // Public portfolio photo; delivery is public MinIO */avatars/* or /api/media proxy.
        await filesApi.upload(key, raw, { contentType: raw.type || "image/jpeg" });
        // Uses MEDIA_PUBLIC_URL on the server (MinIO path-style or app /api/media).
        const publicUrl = await filesApi.url(key);
        await persistAvatar(publicUrl);
        if (deletePreviousOnChange && previous && previous !== publicUrl) {
          void deletePreviousObject(previous);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : uploadErrorFallback;
        setUploadError(message);
        toast.error(message);
      }
      setUploading(false);
    },
    [
      deletePreviousObject,
      deletePreviousOnChange,
      filesApi,
      persistAvatar,
      savedAvatar,
      uploadErrorFallback
    ]
  );

  const [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps
    }
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: "image/*",
    multiple: false,
    onFilesChange: (next) => {
      void uploadSelected(next[0] ?? null);
    }
  });

  const currentFile = files[0];
  const busy = uploading || disabled;
  const previewUrl =
    currentFile?.preview ?? (suppressDefault ? undefined : (savedAvatar ?? undefined));

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setSuppressDefault(true);
    setUploadError(null);
    const previous = savedAvatar;

    if (currentFile) {
      // removeFile → onFilesChange([]) would call persistAvatar(null); do it once here.
      skipNextEmptyFilesChange.current = true;
      removeFile(currentFile.id);
    }
    void persistAvatar(null).then(() => {
      if (deletePreviousOnChange) void deletePreviousObject(previous);
    });
  };

  const roundedClass = shape === "rounded" ? "rounded-xl" : "rounded-full";
  const objectClass = shape === "rounded" ? "object-contain p-1.5" : "object-cover";
  const emptyLabel = labels?.empty ?? "Upload photo";
  const changeLabel = labels?.change ?? "Change photo";
  const uploadingLabel = labels?.uploading ?? "Uploading…";
  const ariaUpload = labels?.ariaUpload ?? "Upload profile photo";
  const ariaRemove = labels?.ariaRemove ?? "Remove profile photo";

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "start" ? "items-start" : "items-center",
        className
      )}
    >
      <div className="relative">
        <input {...getInputProps()} className="sr-only" disabled={busy} />
        <button
          type="button"
          id={id}
          className={cn(
            "group/avatar relative size-24 cursor-pointer overflow-hidden border border-dashed transition-colors",
            roundedClass,
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/40",
            previewUrl && "border-solid",
            busy && "pointer-events-none opacity-70"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => {
            if (!busy) openFileDialog();
          }}
          disabled={busy}
          aria-label={ariaUpload}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" className={cn("size-full", objectClass)} />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted">
              <EmptyIcon className="size-6 text-muted-foreground" />
            </div>
          )}

          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2Icon className="size-6 animate-spin text-foreground" aria-hidden />
              <span className="sr-only">Uploading</span>
            </div>
          ) : null}
        </button>

        {previewUrl && !uploading ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={handleRemove}
            className="absolute inset-e-0.5 top-0.5 z-10 size-6 rounded-full"
            aria-label={ariaRemove}
            disabled={busy}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className={cn("space-y-0.5", align === "start" ? "text-start" : "text-center")}>
        <p className="text-sm font-medium">
          {uploading ? uploadingLabel : previewUrl ? changeLabel : emptyLabel}
        </p>
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to {formatBytes(maxSize)}</p>
      </div>

      {(errors.length > 0 || uploadError) && (
        <Alert variant="error" className="w-full max-w-xs">
          <CircleAlertIcon />
          <AlertTitle>Upload error</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className="last:mb-0">
                {error}
              </p>
            ))}
            {uploadError ? <p className="last:mb-0">{uploadError}</p> : null}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
