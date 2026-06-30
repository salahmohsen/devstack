"use client";

import { useStore } from "@tanstack/react-form";
import { useFiles } from "files-sdk/react";
import { X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { UploadProgress } from "@/components/files-sdk/upload-progress";

import { useFieldContext } from "./form-contexts";

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { key } = await files.upload(file);
      const publicUrl = await files.url(key);
      field.handleChange(publicUrl);
    } catch {
      // files.error is rendered below
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleClear() {
    field.handleChange("");
  }

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
          disabled={files.isUploading}
        >
          {files.isUploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
        </Button>
        <UploadProgress files={files} />
      </div>
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      {files.error ? <FieldError errors={[{ message: files.error.message }]} /> : null}
    </Field>
  );
}

export { ImageField };
