"use client";

import { type PropsWithChildren } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { InputGroup, InputGroupInput } from "@tsu-stack/ui/components/input-group";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
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
    inputGroup?: string;
  };
};

function InputGroupField(props: PropsWithChildren<InputFieldProps>) {
  const field = useFieldContext<string>();

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
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          type={props.type ?? "text"}
          value={field.state.value ?? ""}
          placeholder={props.placeholder}
          className={props.classNames?.input}
        />
        {props.children}
      </InputGroup>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { InputGroupField };
