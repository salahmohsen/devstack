"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { SecretInput } from "@tsu-stack/ui/components/secret-input";

import { useFieldContext } from "./form-contexts";

type SecretInputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  /** Server has an encrypted secret on file. */
  hasSavedSecret?: boolean;
  /** Last 4 characters for partial display. */
  savedLast4?: string | null;
};

/**
 * TanStack Form field for write-only secrets (API keys, webhook secrets).
 * Prefer this over PasswordInputField when the server only exposes last4.
 */
function SecretInputField(props: SecretInputFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      <SecretInput
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        hasSavedSecret={props.hasSavedSecret}
        savedLast4={props.savedLast4}
        placeholder={props.placeholder}
      />
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { SecretInputField };
