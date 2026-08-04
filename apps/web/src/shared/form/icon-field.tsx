"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";

import { IconPicker, type IconPickerProps } from "@/shared/ui/icon-picker";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
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
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: classNames?.label,
          description: classNames?.description
        }}
      />
      <IconPicker
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={(icon) => field.handleChange(icon)}
        value={field.state.value ?? ""}
        className={classNames?.input}
        {...rest}
      />
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
}

export { IconPickerField };
