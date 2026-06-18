"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { PasswordInput } from "@tsu-stack/ui/components/password-input";

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
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      <PasswordInput
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value ?? ""}
        placeholder={props.placeholder}
      />
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { PasswordInputField };
