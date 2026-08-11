"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { UsernameSchema } from "@tsu-stack/core";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@tsu-stack/ui/components/input-group";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type UsernameFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  /** Current saved username — suppresses the “available” checkmark when unchanged. */
  currentUsername?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
    inputGroup?: string;
  };
};

function normalizeFieldErrors(raw: unknown[]): Array<{ message: string }> {
  return raw
    .filter((error): error is NonNullable<typeof error> => error != null)
    .map((error) => {
      if (typeof error === "string") return { message: error };
      if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === "string" && message.length > 0) {
          return { message };
        }
      }
      return { message: "Invalid username" };
    });
}

/**
 * Username input with trailing status: spinner while debounced async check runs,
 * green check only after a completed successful availability check for the current value.
 */
function UsernameField(props: UsernameFieldProps) {
  const field = useFieldContext<string>();
  const value = field.state.value ?? "";
  const isValidating = field.state.meta.isValidating;
  const errors = normalizeFieldErrors(field.state.meta.errors);
  const hasError = errors.length > 0;
  const normalized = value.trim().toLowerCase();
  const isCurrent =
    Boolean(props.currentUsername) && normalized === props.currentUsername?.toLowerCase();
  const formatValid = UsernameSchema.safeParse(value).success;
  const isDirty = field.state.meta.isDirty;

  // Track last isValidating + last confirmed username. Updated during render when
  // inputs change (React-supported "adjusting state when a prop changes" pattern).
  const [availability, setAvailability] = useState<{
    wasValidating: boolean;
    confirmedFor: string | null;
  }>({ wasValidating: false, confirmedFor: null });

  let confirmedFor = availability.confirmedFor;
  let wasValidating = availability.wasValidating;
  let availabilityDirty = false;

  if (isValidating && !wasValidating) {
    wasValidating = true;
    confirmedFor = null;
    availabilityDirty = true;
  } else if (!isValidating && wasValidating) {
    wasValidating = false;
    if (!hasError && !isCurrent && formatValid && isDirty && normalized.length > 0) {
      confirmedFor = normalized;
    } else {
      confirmedFor = null;
    }
    availabilityDirty = true;
  }

  if (
    confirmedFor !== null &&
    (confirmedFor !== normalized || hasError || isCurrent || !formatValid || !isDirty)
  ) {
    confirmedFor = null;
    availabilityDirty = true;
  }

  if (availabilityDirty) {
    setAvailability({ wasValidating, confirmedFor });
  }

  const showAvailable = confirmedFor !== null && confirmedFor === normalized;

  let statusLabel = "";
  if (isValidating) statusLabel = "Checking username";
  else if (showAvailable) statusLabel = "Username available";
  else if (hasError) statusLabel = errors[0]?.message ?? "Invalid username";
  else if (isCurrent) statusLabel = "Current username";

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
      <InputGroup className={props.classNames?.inputGroup}>
        <InputGroupInput
          id={field.name}
          name={field.name}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          type="text"
          value={value}
          placeholder={props.placeholder}
          aria-busy={isValidating || undefined}
          aria-describedby={statusLabel ? `${field.name}-status` : undefined}
          className={props.classNames?.input}
        />
        <InputGroupAddon align="inline-end" className="pointer-events-none">
          {isValidating ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          {showAvailable ? <Check size={16} className="text-success" aria-hidden /> : null}
        </InputGroupAddon>
      </InputGroup>
      <FieldError errors={errors} className={props.classNames?.error} />
      <span id={`${field.name}-status`} className="sr-only" aria-live="polite">
        {statusLabel}
      </span>
    </Field>
  );
}

export { UsernameField };
