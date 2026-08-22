"use client";

import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger
} from "@tsu-stack/ui/components/combobox";
import { Input } from "@tsu-stack/ui/components/input";
import { NumberField, NumberFieldInput } from "@tsu-stack/ui/components/number-field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useFilterChip, useFiltersActions } from "./filters-context";
import {
  type FilterField,
  type FilterOption,
  type FilterSize,
  type FilterValue,
  type MultiSelectFilterField,
  type NumberFilterField,
  type SelectFilterField,
  type TextFilterField
} from "./lib/filters-types";
import {
  asNumberOrNull,
  asNumberRange,
  asString,
  asStringArray,
  FILTER_SIZES,
  operatorShapeFor
} from "./lib/filters-utils";

type ValueControlProps<F extends FilterField> = {
  field: F;
  filter: FilterValue;
  size: FilterSize;
  autoOpen: boolean;
  onValueChange: (value: unknown) => void;
};

/**
 * The value segment of a pill. Renders the control matching the field type,
 * or nothing when the operator's shape is `"none"` (`is empty`), so custom
 * chip compositions are correct without re-implementing that rule.
 */
function FilterChipValue(): React.ReactElement | null {
  const { field, filter, size, autoOpen } = useFilterChip();
  const { updateFilter } = useFiltersActions();
  const onValueChange = React.useCallback(
    (nextValue: unknown) => updateFilter(filter.id, { value: nextValue }),
    [updateFilter, filter.id]
  );

  if (operatorShapeFor(field, filter.operator) === "none") return null;

  switch (field.type) {
    case "select":
    case "multiselect":
      return (
        <OptionsValueControl
          field={field}
          filter={filter}
          size={size}
          autoOpen={autoOpen}
          onValueChange={onValueChange}
        />
      );
    case "text":
      return (
        <TextValueControl
          field={field}
          filter={filter}
          size={size}
          autoOpen={autoOpen}
          onValueChange={onValueChange}
        />
      );
    case "number":
      return (
        <NumberValueControl
          field={field}
          filter={filter}
          size={size}
          autoOpen={autoOpen}
          onValueChange={onValueChange}
        />
      );
    case "custom":
      return (
        <div className="flex items-stretch" data-slot="filter-chip-value">
          {field.renderValue({
            value: filter.value,
            operator: filter.operator,
            onValueChange,
            size,
            field
          })}
        </div>
      );
    default:
      return null;
  }
}

/** Accessible name for a value input, folding in string affixes ("$", "hrs"). */
function valueAriaLabel(field: TextFilterField | NumberFilterField, part: string): string {
  const affixes = [field.prefix, field.suffix].filter(
    (affix): affix is string => typeof affix === "string"
  );
  return [`${field.label} ${part}`, ...affixes].join(" ");
}

// ----- Select / multiselect ----------------------------------------------

const VALUE_TRIGGER_CLASSES = "rounded-none font-normal text-foreground data-popup-open:bg-accent";

function OptionContent({ option }: { option: FilterOption }): React.ReactElement {
  return (
    <span className="flex items-center gap-2">
      {option.icon}
      <span className="truncate">{option.label}</span>
    </span>
  );
}

type OptionsTriggerProps = {
  size: FilterSize;
  icon?: React.ReactNode;
  text: string;
  isPlaceholder: boolean;
  /** Accessible name with field context, e.g. "Status value: Done". */
  "aria-label": string;
};

/** Shared ghost trigger for the single- and multi-select value popups. */
function OptionsTrigger({
  size,
  icon,
  text,
  isPlaceholder,
  "aria-label": ariaLabel
}: OptionsTriggerProps): React.ReactElement {
  return (
    <ComboboxTrigger
      data-slot="filter-chip-value"
      render={(triggerProps) => (
        <Button
          {...triggerProps}
          aria-label={ariaLabel}
          className={VALUE_TRIGGER_CLASSES}
          data-slot="filter-chip-value"
          size={size}
          variant="ghost"
        />
      )}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className={cn("max-w-40 truncate", isPlaceholder && "text-muted-foreground")}>
          {text}
        </span>
      </span>
    </ComboboxTrigger>
  );
}

/**
 * The searchable popup shell shared by the value pickers and the add-filter
 * menu: bordered search header, empty state, and the option list.
 */
function FilterSearchPopup({
  placeholder,
  empty,
  className,
  children
}: {
  placeholder: string;
  empty: React.ReactNode;
  className?: string;
  children: React.ComponentProps<typeof ComboboxList>["children"];
}): React.ReactElement {
  return (
    <ComboboxPopup className={cn("flex min-w-52 flex-col p-0", className)}>
      <div className="border-b p-2">
        <ComboboxInput placeholder={placeholder} showClear={false} showTrigger={false} />
      </div>
      <ComboboxEmpty>{empty}</ComboboxEmpty>
      <ComboboxList>{children}</ComboboxList>
    </ComboboxPopup>
  );
}

function OptionsPopup({
  children
}: {
  children: React.ComponentProps<typeof ComboboxList>["children"];
}): React.ReactElement {
  const { labels } = useFiltersActions();
  return (
    <FilterSearchPopup empty={labels.noResults} placeholder={labels.searchValues}>
      {children}
    </FilterSearchPopup>
  );
}

/** Value control for `select` and `multiselect` fields. */
function OptionsValueControl({
  field,
  filter,
  size,
  autoOpen,
  onValueChange
}: ValueControlProps<SelectFilterField | MultiSelectFilterField>): React.ReactElement {
  const { labels } = useFiltersActions();
  // Capture once at mount so the uncontrolled open state never changes.
  const [initialOpen] = React.useState(autoOpen);
  const placeholder = field.placeholder ?? labels.selectValue;

  if (field.type === "multiselect") {
    const values = asStringArray(filter.value);
    const selected = field.options.filter((option) => values.includes(option.value));
    const atMax = field.maxSelections != null && values.length >= field.maxSelections;
    const firstSelected = selected[0];
    const display =
      firstSelected == null
        ? placeholder
        : selected.length === 1
          ? firstSelected.label
          : `${firstSelected.label} +${selected.length - 1}`;

    return (
      <Combobox<FilterOption, true>
        defaultOpen={initialOpen}
        itemToStringLabel={(option) => option.label}
        items={field.options}
        multiple
        onValueChange={(next) => {
          // Reject selections past the cap; the controlled value snaps back.
          if (field.maxSelections != null && next.length > field.maxSelections) {
            return;
          }
          onValueChange(next.map((option) => option.value));
        }}
        value={selected}
      >
        <OptionsTrigger
          aria-label={`${field.label} ${labels.value.toLowerCase()}: ${display}`}
          icon={firstSelected?.icon}
          isPlaceholder={selected.length === 0}
          size={size}
          text={display}
        />
        <OptionsPopup>
          {(option: FilterOption) => (
            <ComboboxItem
              disabled={atMax && !values.includes(option.value)}
              key={option.value}
              value={option}
            >
              <OptionContent option={option} />
            </ComboboxItem>
          )}
        </OptionsPopup>
      </Combobox>
    );
  }

  const selected = field.options.find((option) => option.value === filter.value) ?? null;

  return (
    <Combobox<FilterOption, false>
      defaultOpen={initialOpen}
      itemToStringLabel={(option) => option.label}
      items={field.options}
      onValueChange={(next) => onValueChange(next ? next.value : null)}
      value={selected}
    >
      <OptionsTrigger
        aria-label={`${field.label} ${labels.value.toLowerCase()}: ${selected?.label ?? placeholder}`}
        icon={selected?.icon}
        isPlaceholder={!selected}
        size={size}
        text={selected?.label ?? placeholder}
      />
      <OptionsPopup>
        {(option: FilterOption) => (
          <ComboboxItem key={option.value} value={option}>
            <OptionContent option={option} />
          </ComboboxItem>
        )}
      </OptionsPopup>
    </Combobox>
  );
}

// ----- Text / number ------------------------------------------------------

/**
 * The value segment wrapper for inline inputs. Owns the `filter-chip-value`
 * slot and flanks the input with muted prefix/suffix text (e.g. `$`, `%`).
 */
function ValueSegment({
  prefix,
  suffix,
  children
}: {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={cn("flex items-center", prefix && "[&_input]:ps-1", suffix && "[&_input]:pe-1")}
      data-slot="filter-chip-value"
    >
      {prefix ? (
        <span className="ps-2.5 text-sm text-muted-foreground select-none">{prefix}</span>
      ) : null}
      {children}
      {suffix ? (
        <span className="pe-2.5 text-sm text-muted-foreground select-none">{suffix}</span>
      ) : null}
    </div>
  );
}

function TextValueControl({
  field,
  filter,
  size,
  autoOpen,
  onValueChange
}: ValueControlProps<TextFilterField>): React.ReactElement {
  const { labels } = useFiltersActions();
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (autoOpen) inputRef.current?.focus();
  }, [autoOpen]);
  return (
    <ValueSegment prefix={field.prefix} suffix={field.suffix}>
      <Input
        aria-label={valueAriaLabel(field, labels.value.toLowerCase())}
        className={cn(
          "w-40 flex-none rounded-none border-0 bg-transparent shadow-none before:hidden has-focus-visible:border-transparent has-focus-visible:ring-0 dark:bg-transparent",
          FILTER_SIZES[size].height
        )}
        data-slot="filter-chip-value-input"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.placeholder ?? labels.enterValue}
        ref={inputRef}
        size={FILTER_SIZES[size].input}
        type="text"
        value={asString(filter.value)}
      />
    </ValueSegment>
  );
}

function NumberValueField({
  value,
  size,
  step,
  placeholder,
  shouldFocus,
  prefix,
  suffix,
  "aria-label": ariaLabel,
  onValueChange
}: {
  value: number | null;
  size: FilterSize;
  step?: number;
  placeholder?: string;
  shouldFocus?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  "aria-label": string;
  onValueChange: (value: number | null) => void;
}): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (shouldFocus) inputRef.current?.focus();
  }, [shouldFocus]);
  return (
    <ValueSegment prefix={prefix} suffix={suffix}>
      <NumberField
        allowWheelScrub
        className={cn("w-auto flex-none flex-row items-center gap-0", FILTER_SIZES[size].height)}
        onValueChange={(next) => onValueChange(next)}
        size={FILTER_SIZES[size].input}
        step={step}
        value={value}
      >
        <NumberFieldInput
          aria-label={ariaLabel}
          className="h-full w-24 grow-0 rounded-none border-0 bg-transparent px-2.5 text-start font-normal placeholder:text-muted-foreground"
          data-slot="filter-chip-value-input"
          placeholder={placeholder}
          ref={inputRef}
        />
      </NumberField>
    </ValueSegment>
  );
}

function NumberValueControl({
  field,
  filter,
  size,
  autoOpen,
  onValueChange
}: ValueControlProps<NumberFilterField>): React.ReactElement {
  const { labels } = useFiltersActions();

  if (operatorShapeFor(field, filter.operator) === "range") {
    const range = asNumberRange(filter.value);
    return (
      <>
        <NumberValueField
          aria-label={valueAriaLabel(field, labels.min.toLowerCase())}
          shouldFocus={autoOpen}
          onValueChange={(min) => onValueChange({ ...range, min })}
          placeholder={labels.min}
          prefix={field.prefix}
          size={size}
          step={field.step}
          suffix={field.suffix}
          value={range.min}
        />
        <NumberValueField
          aria-label={valueAriaLabel(field, labels.max.toLowerCase())}
          onValueChange={(max) => onValueChange({ ...range, max })}
          placeholder={labels.max}
          prefix={field.prefix}
          size={size}
          step={field.step}
          suffix={field.suffix}
          value={range.max}
        />
      </>
    );
  }

  return (
    <NumberValueField
      aria-label={valueAriaLabel(field, labels.value.toLowerCase())}
      shouldFocus={autoOpen}
      onValueChange={onValueChange}
      placeholder={field.placeholder ?? labels.value}
      prefix={field.prefix}
      size={size}
      step={field.step}
      suffix={field.suffix}
      value={asNumberOrNull(filter.value)}
    />
  );
}

export { FilterChipValue, FilterSearchPopup };
