import type * as React from "react";

/** Size of the filter bar and its pills. */
export type FilterSize = "sm" | "default" | "lg";

/** Built-in field types. `custom` renders its own value control. */
export type FilterFieldType = "select" | "multiselect" | "text" | "number" | "custom";

/** A selectable option for `select` / `multiselect` fields. */
export type FilterOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

/**
 * The value shape an operator expects: `"none"` hides the value segment
 * (`is empty`), `"range"` renders paired min/max inputs on number fields
 * (`between`), and `"scalar"` renders the field's normal single control.
 */
export type FilterOperatorShape = "none" | "scalar" | "range";

/** An operator shown in the middle segment of a pill (`is`, `contains`, ...). */
export type FilterOperator = {
  id: string;
  label: string;
  /** Value shape this operator expects. Defaults to `"scalar"`. */
  shape?: FilterOperatorShape;
  /** Sugar for `shape: "none"`, e.g. `is empty` / `is not empty`. */
  valueless?: boolean;
};

type FilterFieldBase = {
  /** Stable key stored on each filter as `FilterValue.field`. */
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Override the default operators for this field's type. */
  operators?: FilterOperator[];
  /** Hide specific default operators by id. */
  disabledOperators?: string[];
};

export type SelectFilterField = {
  type: "select";
  options: FilterOption[];
  placeholder?: string;
} & FilterFieldBase;

export type MultiSelectFilterField = {
  type: "multiselect";
  options: FilterOption[];
  placeholder?: string;
  /** Maximum number of options that can be selected. */
  maxSelections?: number;
} & FilterFieldBase;

export type TextFilterField = {
  type: "text";
  placeholder?: string;
  /** Content shown before the input, e.g. `@` or an icon. */
  prefix?: React.ReactNode;
  /** Content shown after the input, e.g. a unit label. */
  suffix?: React.ReactNode;
} & FilterFieldBase;

export type NumberFilterField = {
  type: "number";
  placeholder?: string;
  step?: number;
  /** Content shown before the input, e.g. `$`. */
  prefix?: React.ReactNode;
  /** Content shown after the input, e.g. `%` or `hrs`. */
  suffix?: React.ReactNode;
} & FilterFieldBase;

export type CustomFilterField = {
  type: "custom";
  /** Renders the value segment and reports changes back to the filter. */
  renderValue: (props: FilterValueControlProps) => React.ReactNode;
  /** Seed value for a fresh filter of this field. */
  defaultValue?: unknown;
} & FilterFieldBase;

export type FilterField =
  | SelectFilterField
  | MultiSelectFilterField
  | TextFilterField
  | NumberFilterField
  | CustomFilterField;

/** Props passed to a `custom` field's `renderValue`. */
export type FilterValueControlProps = {
  value: unknown;
  operator: string;
  onValueChange: (value: unknown) => void;
  size: FilterSize;
  field: FilterField;
};

/** Value shape for a `number` field when the operator is `between`. */
export type NumberRange = {
  min: number | null;
  max: number | null;
};

/**
 * A single active filter. `value` is typed by the field:
 * `select → string | null`, `multiselect → string[]`, `text → string`,
 * `number → number | null | NumberRange`, `custom → unknown`.
 */
export type FilterValue = {
  id: string;
  field: string;
  operator: string;
  value: unknown;
};

/** Copy overrides for the bar's chrome. */
export type FiltersLabels = {
  add: string;
  clear: string;
  searchFields: string;
  searchValues: string;
  noFields: string;
  noResults: string;
  selectValue: string;
  enterValue: string;
  value: string;
  min: string;
  max: string;
  /** Word used in the operator trigger's accessible name. */
  operator: string;
  /** Builds the accessible label for a pill's remove button. */
  removeFilter: (fieldLabel: string) => string;
};

export type FiltersProviderProps = {
  /** Field definitions the bar can filter on. */
  fields: FilterField[];
  /** Controlled list of active filters. */
  value?: FilterValue[];
  /** Initial filters in uncontrolled mode. */
  defaultValue?: FilterValue[];
  onValueChange?: (value: FilterValue[]) => void;
  size?: FilterSize;
  /** Allow the same field to be added more than once. Defaults to `false`. */
  allowDuplicateFields?: boolean;
  labels?: Partial<FiltersLabels>;
  children?: React.ReactNode;
};

export type FiltersBarProps = {
  /** Key that opens the add-filter menu, forwarded to the default `FilterAddButton`. */
  shortcut?: string;
} & Omit<React.ComponentProps<"div">, "onChange" | "defaultValue">;

export type FiltersProps = {} & Omit<FiltersProviderProps, "children"> & FiltersBarProps;

export type FilterChipProps = {
  filter: FilterValue;
  /** Field definition. Resolved from the `Filters` context when omitted. */
  field?: FilterField;
} & Omit<React.ComponentProps<"div">, "onChange">;
