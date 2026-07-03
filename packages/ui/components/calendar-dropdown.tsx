"use client";
import * as React from "react";
import { type DayPicker, type DropdownProps } from "react-day-picker";

export type { Mode, OnSelectHandler } from "react-day-picker";

import { Calendar } from "@tsu-stack/ui/components/calendar";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup
} from "@tsu-stack/ui/components/combobox";

type DropdownItem = {
  disabled?: boolean;
  label: string;
  value: string;
};

function Dropdown(props: DropdownProps) {
  const { options, value, onChange, "aria-label": ariaLabel } = props;

  const items: DropdownItem[] =
    options?.map((option) => {
      return {
        disabled: option.disabled,
        label: option.label,
        value: option.value.toString()
      };
    }) ?? [];

  const selectedItem = items.find((item) => item.value === value?.toString());

  const handleValueChange = (newValue: DropdownItem | null) => {
    if (onChange && newValue) {
      const syntheticEvent = {
        target: { value: newValue.value }
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <Combobox
      aria-label={ariaLabel}
      autoHighlight
      items={items}
      onValueChange={handleValueChange}
      value={selectedItem}
    >
      <ComboboxInput
        className="**:[input]:w-0 **:[input]:flex-1"
        onFocus={(e) => e.currentTarget.select()}
      />
      <ComboboxPopup aria-label={ariaLabel}>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: DropdownItem) => (
            <ComboboxItem disabled={item.disabled} key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function CalendarDropdown(props: CalendarProps) {
  return (
    <Calendar
      captionLayout="dropdown"
      components={{ Dropdown }}
      endMonth={new Date(2030, 11)}
      mode="single"
      startMonth={new Date(1995, 0)}
      {...props}
    />
  );
}
