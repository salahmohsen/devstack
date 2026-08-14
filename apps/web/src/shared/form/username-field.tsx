"use client";

import { type ReactNode } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Group } from "@tsu-stack/ui/components/group";
import { Input } from "@tsu-stack/ui/components/input";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type UsernameFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  readOnly?: boolean;
  /** Used when `label` is omitted so the input stays named for assistive tech. */
  ariaLabel?: string;
  /** Trailing group actions (Cancel / Rename) joined to the input. */
  actions?: ReactNode;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
    group?: string;
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
 * Username input. Availability is field-level async validation (errors below).
 * No in-input spinner / check — pair with grouped Cancel / Submit actions.
 */
function UsernameField(props: UsernameFieldProps) {
  const field = useFieldContext<string>();
  const value = field.state.value ?? "";
  const errors = normalizeFieldErrors(field.state.meta.errors);
  const isValidating = field.state.meta.isValidating;

  const control = (
    <Input
      id={field.name}
      name={field.name}
      autoComplete="username"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      readOnly={props.readOnly}
      onBlur={field.handleBlur}
      onChange={(e) => {
        // validate() no-ops until touched; mark on first keystroke so every
        // subsequent edit re-runs onChangeAsync (not only the first blur).
        if (!field.state.meta.isTouched) {
          field.setMeta((prev) => {
            return { ...prev, isTouched: true };
          });
        }
        field.handleChange(e.target.value);
      }}
      type="text"
      value={value}
      placeholder={props.placeholder}
      aria-label={props.label ? undefined : props.ariaLabel}
      aria-busy={isValidating || undefined}
      className={cn(props.actions && "min-w-0 flex-1", props.classNames?.input)}
    />
  );

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
      {props.actions ? (
        <Group className={props.classNames?.group ?? "w-full min-w-0 items-stretch"}>
          {control}
          {props.actions}
        </Group>
      ) : (
        control
      )}
      <FieldError errors={errors} className={props.classNames?.error} />
    </Field>
  );
}

export { UsernameField };
