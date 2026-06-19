"use client";

import { type PropsWithChildren } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { InputGroup, InputGroupInput } from "@tsu-stack/ui/components/input-group";

import { useFieldContext } from "./form-contexts";

type InputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  type?: string;
  className?: string;
};

function InputGroupField(props: PropsWithChildren<InputFieldProps>) {
  const field = useFieldContext<string>();

  return (
    <Field>
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      <InputGroup>
        <InputGroupInput
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          type={props.type ?? "text"}
          value={field.state.value ?? ""}
          placeholder={props.placeholder}
          className={props.className}
        />
        {props.children}
      </InputGroup>
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { InputGroupField };
