"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from "@tsu-stack/ui/components/number-field";

import { useFieldContext } from "./form-contexts";

type NumberFieldFormProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  size?: "sm" | "default" | "lg";
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    root?: string;
  };
};

function NumberFieldForm(props: NumberFieldFormProps) {
  const field = useFieldContext<number>();
  const value = field.state.value;

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel className={props.classNames?.label}>{props.label}</FieldLabel>
      ) : null}
      <NumberField
        className={props.classNames?.root}
        max={props.max}
        min={props.min}
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={(next) => {
          if (next == null) {
            field.handleChange(0);
            return;
          }
          field.handleChange(next);
        }}
        size={props.size}
        step={props.step}
        value={value ?? 0}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput placeholder={props.placeholder} />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      {props.description ? (
        <FieldDescription className={props.classNames?.description}>
          {props.description}
        </FieldDescription>
      ) : null}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { NumberFieldForm };
