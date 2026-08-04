"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { SecretInput } from "@tsu-stack/ui/components/secret-input";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
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
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
      />
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
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { SecretInputField };
