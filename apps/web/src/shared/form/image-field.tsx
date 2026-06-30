"use client";

import { useStore } from "@tanstack/react-form";
import { X } from "lucide-react";
import { useState } from "react";
import { type ClientUploadedFileData } from "uploadthing/types";

import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { UploadButton } from "@/shared/lib/uploadthing";

import { useFieldContext } from "./form-contexts";

type ImageFieldProps = {
  label?: string;
  description?: string;
  className?: string;
};

function ImageField(props: ImageFieldProps) {
  const field = useFieldContext<string>();
  const value = useStore(field.form.store, (state) => state.values[field.name]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleUploadComplete(files: ClientUploadedFileData<{ uploadedBy: string }>[]) {
    const uploaded = files[0];
    if (!uploaded) return;
    const url = uploaded.ufsUrl || uploaded.appUrl || uploaded.url;
    if (!url) {
      setUploadError("Upload finished but no file URL was returned.");
      return;
    }
    field.handleChange(url);
    setUploadError(null);
  }

  function handleClear() {
    field.handleChange("");
    setUploadError(null);
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
        <UploadButton
          endpoint="imageUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error) => {
            setUploadError(error.message);
          }}
          content={{
            button({ ready }) {
              if (!ready) return "Loading...";
              return value ? "Replace image" : "Upload image";
            }
          }}
        />
      </div>
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      {uploadError ? <FieldError errors={[{ message: uploadError }]} /> : null}
    </Field>
  );
}

export { ImageField };
