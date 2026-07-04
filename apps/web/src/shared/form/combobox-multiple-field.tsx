"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue
} from "@tsu-stack/ui/components/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { useFieldContext } from "./form-contexts";

type ComboboxItemType = {
  value: string;
  label: string;
  icon?: React.ReactNode | null;
};

type ComboboxMultipleFieldProps = {
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
    chips?: string;
    content?: string;
    list?: string;
    item?: string;
  };
};

function ComboboxMultipleField(props: ComboboxMultipleFieldProps) {
  const field = useFieldContext<string[]>();
  const selectedValues: string[] = field.state.value ?? [];
  const value: ComboboxItemType[] = props.items.filter((item) =>
    selectedValues.includes(item.value)
  );

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel className={props.classNames?.label}>{props.label}</FieldLabel>
      ) : null}
      <Combobox
        items={props.items}
        multiple
        itemToStringValue={(item) => item.value}
        onValueChange={(next) => {
          const arr: ComboboxItemType[] = Array.isArray(next) ? next : [];
          field.handleChange(arr.map((item) => item.value));
        }}
        value={value}
      >
        <ComboboxChips className={props.classNames?.chips}>
          <ComboboxValue>
            {(selected: ComboboxItemType[]) => (
              <>
                {selected?.map((item) => (
                  <ComboboxChip aria-label={item.label} key={item.value}>
                    {item.icon ? (
                      <span aria-hidden="true" className="me-1 [&_svg]:size-3.5 [&_svg]:shrink-0">
                        {item.icon}
                      </span>
                    ) : null}
                    {item.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-label={props.label ?? "Select items"}
                  placeholder={
                    selected.length > 0 ? undefined : (props.placeholder ?? "Select items...")
                  }
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxPopup className={props.classNames?.content}>
          <ComboboxEmpty>{props.emptyMessage ?? "No results found."}</ComboboxEmpty>
          <ComboboxList className={props.classNames?.list}>
            {(item: ComboboxItemType) => (
              <ComboboxItem key={item.value} value={item} className={props.classNames?.item}>
                <span className="flex items-center">
                  {item.icon ? (
                    <span aria-hidden="true" className="me-1 [&_svg]:size-4 [&_svg]:shrink-0">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      {props.description ? (
        <FieldDescription className={props.classNames?.description}>
          {props.description}
        </FieldDescription>
      ) : null}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { ComboboxMultipleField };
export type { ComboboxItemType };
