"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { useFieldContext } from "./form-contexts";

type InputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  type?: string;
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
      {props.label ? (
        <FieldLabel htmlFor={field.name} className={props.classNames?.label}>
          {props.label}
        </FieldLabel>
      ) : null}
      <Input
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        type={props.type ?? "text"}
        value={field.state.value ?? ""}
        placeholder={props.placeholder}
        className={props.classNames?.input}
      />
      {props.description ? (
        <FieldDescription className={props.classNames?.description}>
          {props.description}
        </FieldDescription>
      ) : null}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { InputField };
