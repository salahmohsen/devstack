"use client";

import { DatePicker } from "@tsu-stack/ui/components/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { useFieldContext } from "./form-contexts";

type DatePickerFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  valueFormat?: string;
  className?: string;
};

function DatePickerField(props: DatePickerFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      <DatePicker
        displayFormat="MMM d, yyyy"
        onChange={(value) => field.handleChange(value)}
        placeholder={props.placeholder ?? "Pick a date"}
        value={field.state.value}
        valueFormat={props.valueFormat ?? "yyyy-MM-dd"}
        className={props.className}
      />
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { DatePickerField };
