"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { IconPicker, type IconPickerProps } from "@/shared/ui/icon-picker";

import { useFieldContext } from "./form-contexts";

type IconPickerFieldProps = {
  label?: string;
  description?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
} & Omit<IconPickerProps, "classNames">;

function IconPickerField(props: IconPickerFieldProps) {
  const field = useFieldContext<string>();
  const { classNames, ...rest } = props;

  return (
    <Field className={classNames?.field}>
      {props.label ? (
        <FieldLabel htmlFor={field.name} className={classNames?.label}>
          {props.label}
        </FieldLabel>
      ) : null}
      <IconPicker
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={(icon) => field.handleChange(icon)}
        value={field.state.value ?? ""}
        className={classNames?.input}
        {...rest}
      />
      {props.description ? (
        <FieldDescription className={classNames?.description}>{props.description}</FieldDescription>
      ) : null}
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
}

export { IconPickerField };
