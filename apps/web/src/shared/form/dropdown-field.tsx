"use client";

import { useCallback } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { useFieldContext } from "./form-contexts";

type DropdownItem = {
  value: string;
  label: string;
};

type DropdownFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  items: DropdownItem[];
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
    content?: string;
    list?: string;
    item?: string;
  };
};

function DropdownField(props: DropdownFieldProps) {
  const field = useFieldContext<string>();

  const itemToStringLabel = useCallback(
    (val: string) => {
      const item = props.items.find((i) => i.value === val);
      return item?.label ?? val;
    },
    [props.items]
  );

  const itemsMap = Object.fromEntries(props.items.map((i) => [i.value, i.label]));

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel className={props.classNames?.label}>{props.label}</FieldLabel>
      ) : null}
      <Select
        value={field.state.value || null}
        onValueChange={(val) => field.handleChange(val ?? "")}
        itemToStringLabel={itemToStringLabel}
        items={itemsMap}
      >
        <SelectTrigger className={props.classNames?.input}>
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectPopup className={props.classNames?.content}>
          <SelectList className={props.classNames?.list}>
            {props.items.map((item) => (
              <SelectItem key={item.value} value={item.value} className={props.classNames?.item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectPopup>
      </Select>
      {props.description ? (
        <FieldDescription className={props.classNames?.description}>
          {props.description}
        </FieldDescription>
      ) : null}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { DropdownField };
