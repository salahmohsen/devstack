"use client";

import { useStore } from "@tanstack/react-form";
import { useFiles } from "files-sdk/react";
import { Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { UploadProgress } from "@/components/files-sdk/upload-progress";

import { useFieldContext } from "./form-contexts";

const MIN_LOADER_MS = 400;

type ImageFieldProps = {
  label?: string;
  description?: string;
  className?: string;
};

function ImageField(props: ImageFieldProps) {
  const field = useFieldContext<string>();
  const value = useStore(field.form.store, (state) => state.values[field.name]);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useFiles({ endpoint: "/api/files" });
  const [showLoader, setShowLoader] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowLoader(true);
    const started = Date.now();
    try {
      const { key } = await files.upload(file);
      const publicUrl = await files.url(key);
      field.handleChange(publicUrl);
    } catch {
      // files.error is rendered below
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADER_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADER_MS - elapsed));
      }
      setShowLoader(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleClear() {
    field.handleChange("");
  }

  const uploading = files.isUploading || showLoader;

  return (
    <Field>
      {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
      <div className="flex flex-col gap-2">
        {value ? (
          <div className="relative inline-flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={value}
              alt={props.label ?? "Uploaded image"}
              width={96}
              height={96}
              className="size-full object-contain p-1"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 size-5 rounded-full"
              onClick={handleClear}
              aria-label="Remove image"
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading…
            </>
          ) : value ? (
            "Replace image"
          ) : (
            "Upload image"
          )}
        </Button>
        <UploadProgress files={files} />
      </div>
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      {files.error ? <FieldError errors={[{ message: files.error.message }]} /> : null}
    </Field>
  );
}

export { ImageField };
