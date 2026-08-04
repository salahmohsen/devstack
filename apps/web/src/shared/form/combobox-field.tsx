"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@tsu-stack/ui/components/combobox";
import { Field, FieldError } from "@tsu-stack/ui/components/field";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type ComboboxItemType = {
  value: string;
  label: string;
};

type ComboboxFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  emptyMessage?: string;
  items: ComboboxItemType[];
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

function ComboboxField(props: ComboboxFieldProps) {
  const field = useFieldContext<string>();

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
      <Combobox
        value={field.state.value || null}
        onValueChange={(val) => field.handleChange(val ?? "")}
        items={props.items}
      >
        <ComboboxInput
          placeholder={props.placeholder}
          showClear
          className={props.classNames?.input}
        />
        <ComboboxContent className={props.classNames?.content}>
          <ComboboxEmpty>{props.emptyMessage ?? "No results found."}</ComboboxEmpty>
          <ComboboxList className={props.classNames?.list}>
            {(item: ComboboxItemType) => (
              <ComboboxItem key={item.value} value={item.value} className={props.classNames?.item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { ComboboxField };
