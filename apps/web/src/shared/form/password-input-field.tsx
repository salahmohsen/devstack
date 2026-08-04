"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { PasswordInput } from "@tsu-stack/ui/components/password-input";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type PasswordInputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
};

function PasswordInputField(props: PasswordInputFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
      />
      <PasswordInput
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value ?? ""}
        placeholder={props.placeholder}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { PasswordInputField };
