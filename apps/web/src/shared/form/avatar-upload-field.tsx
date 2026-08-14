"use client";

import { type LucideIcon } from "lucide-react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";

import { ProfileAvatarUpload } from "@/shared/ui/profile-avatar-upload";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type AvatarUploadFieldProps = {
  label?: string;
  description?: string;
  disabled?: boolean;
  shape?: "circle" | "rounded";
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
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    upload?: string;
  };
};

function AvatarUploadField(props: AvatarUploadFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <ProfileAvatarUpload
        id={field.name}
        className={props.classNames?.upload}
        defaultAvatar={field.state.value}
        onAvatarUrlChange={(url) => {
          field.handleChange(url ?? "");
        }}
        disabled={props.disabled}
        align="start"
        shape={props.shape}
        emptyIcon={props.emptyIcon}
        labels={props.labels}
        deletePreviousOnChange={false}
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { AvatarUploadField };
