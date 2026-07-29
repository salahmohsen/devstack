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
import { cn } from "@tsu-stack/ui/lib/utils";

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

/**
 * Form-layer density tweaks for multi-combobox in dialogs.
 * Scroll/overflow is owned by packages/ui ComboboxPopup + ComboboxList;
 * only keep a shorter max-height and chip clamp for dense forms.
 */
const CHIPS_FORM_CLASS = "max-h-28 overflow-y-auto";
const POPUP_FORM_CLASS = "max-h-60";

function ComboboxMultipleField(props: ComboboxMultipleFieldProps) {
  const field = useFieldContext<string[]>();
  const selectedValues: string[] = field.state.value ?? [];
  // Keep selected chips even when items haven't been refetched yet (e.g.
  // stacks just created by detect-stacks before stacks.list lands).
  const itemsByValue = new Map(props.items.map((item) => [item.value, item]));
  const value: ComboboxItemType[] = selectedValues.map(
    (id) => itemsByValue.get(id) ?? { value: id, label: id }
  );
  const listItems = props.items;

  return (
    <Field className={props.classNames?.field}>
      {props.label ? (
        <FieldLabel className={props.classNames?.label}>{props.label}</FieldLabel>
      ) : null}
      <Combobox
        items={listItems}
        multiple
        itemToStringValue={(item) => item.value}
        onValueChange={(next) => {
          const arr: ComboboxItemType[] = Array.isArray(next) ? next : [];
          field.handleChange(arr.map((item) => item.value));
        }}
        value={value}
      >
        <ComboboxChips className={cn(CHIPS_FORM_CLASS, props.classNames?.chips)}>
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
        <ComboboxPopup className={cn(POPUP_FORM_CLASS, props.classNames?.content)}>
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
