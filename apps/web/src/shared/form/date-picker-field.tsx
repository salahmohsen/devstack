"use client";

import { DatePicker } from "@tsu-stack/ui/components/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { useFieldContext } from "./form-contexts";

type DatePickerFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  valueFormat?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

function DatePickerField(props: DatePickerFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel htmlFor={field.name} className={props.classNames?.label}>
          {props.label}
        </FieldLabel>
      ) : null}
      <DatePicker
        displayFormat="MMM d, yyyy"
        onChange={(value) => field.handleChange(value)}
        placeholder={props.placeholder ?? "Pick a date"}
        value={field.state.value}
        valueFormat={props.valueFormat ?? "yyyy-MM-dd"}
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

export { DatePickerField };
