"use client";

import { useCallback } from "react";

import { Field, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { useFieldContext } from "./form-contexts";

const YEAR_MIN = 1980;
const currentYear = new Date().getFullYear();
const yearLabels = Array.from({ length: currentYear - YEAR_MIN + 1 }, (_, i) => {
  const year = YEAR_MIN + i;
  return { value: String(year), label: String(year) };
});
const yearItemsMap = Object.fromEntries(yearLabels.map((y) => [y.value, y.label]));

type YearFieldProps = {
  label?: string;
  classNames?: {
    field?: string;
    label?: string;
    error?: string;
    trigger?: string;
    content?: string;
    item?: string;
  };
};

function YearField(props: YearFieldProps) {
  const field = useFieldContext<number>();
  const value = field.state.value;

  const itemToStringLabel = useCallback((val: string) => val, []);

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel className={props.classNames?.label}>{props.label}</FieldLabel>
      ) : null}
      <Select
        value={value != null ? String(value) : null}
        onValueChange={(val) => field.handleChange(val ? Number(val) : currentYear)}
        itemToStringLabel={itemToStringLabel}
        items={yearItemsMap}
      >
        <SelectTrigger className={props.classNames?.trigger}>
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectPopup className={props.classNames?.content}>
          <SelectList className={props.classNames?.item}>
            {yearLabels.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectPopup>
      </Select>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { YearField };
