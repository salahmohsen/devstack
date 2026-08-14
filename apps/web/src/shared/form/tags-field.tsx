"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { TagsInput } from "@tsu-stack/ui/components/tags-input";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type TagsFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  /** Max tags kept after normalize. Default 50. */
  maxItems?: number;
  /** Max characters per tag. Default 120. */
  maxItemLength?: number;
  /** Shown under the control. Pass `null` to hide. */
  hint?: string | null;
  disabled?: boolean;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

/**
 * Free-type multi-value field: tags render inside the input shell.
 * Does not require a fixed options list (unlike ComboboxMultipleField).
 */
function TagsField(props: TagsFieldProps) {
  const field = useFieldContext<string[]>();
  const values = field.state.value ?? [];
  const hasError = field.state.meta.errors.length > 0;

  return (
    <Field className={cn("w-full min-w-0 self-stretch", props.classNames?.field)}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <TagsInput
        id={field.name}
        value={values}
        placeholder={props.placeholder}
        maxItems={props.maxItems}
        maxItemLength={props.maxItemLength}
        hint={props.hint ?? null}
        disabled={props.disabled}
        aria-label={props.label ?? props.placeholder ?? "Tags"}
        aria-invalid={hasError || undefined}
        className={props.classNames?.input}
        onChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { TagsField };
