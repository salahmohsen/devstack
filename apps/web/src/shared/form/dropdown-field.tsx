"use client";

import { useCallback } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
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
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
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
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { DropdownField };
