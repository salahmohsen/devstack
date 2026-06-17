"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { useFieldContext } from "./form-contexts";

type InputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  type?: string;
  className?: string;
};

function InputField(props: InputFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      <Input
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        type={props.type ?? "text"}
        value={field.state.value ?? ""}
        placeholder={props.placeholder}
        className={props.className}
      />
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { InputField };
