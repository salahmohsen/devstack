"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type InputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  maxLength?: number;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

function InputField(props: InputFieldProps) {
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
      <Input
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        maxLength={props.maxLength}
        value={field.state.value ?? ""}
        placeholder={props.placeholder}
        className={props.classNames?.input}
      />

      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { InputField };
