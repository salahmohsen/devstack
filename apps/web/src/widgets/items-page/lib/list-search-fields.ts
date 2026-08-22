import {
  type FilterOption,
  type MultiSelectFilterField,
  type SelectFilterField
} from "@tsu-stack/ui/components/filters";

/** Portfolio / featured selects: `is` / `is_not` only. */
export const BOOLEAN_SELECT_DISABLED_OPERATORS = ["is_empty", "is_not_empty"] as const;

/** Relation multiselects (`projects`, `stacks`): v1 has no `includes_all` / empty. */
export const RELATION_DISABLED_OPERATORS = ["includes_all", "is_empty"] as const;

export const BOOLEAN_SELECT_OPTIONS: FilterOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" }
];

export function createBooleanSelectField(
  id: string,
  label: string,
  overrides?: Partial<SelectFilterField>
): SelectFilterField {
  return {
    id,
    label,
    type: "select",
    options: BOOLEAN_SELECT_OPTIONS,
    disabledOperators: [...BOOLEAN_SELECT_DISABLED_OPERATORS],
    ...overrides
  };
}

export function createPortfolioBooleanField(
  overrides?: Partial<SelectFilterField>
): SelectFilterField {
  return createBooleanSelectField("includedInPortfolio", "In portfolio", overrides);
}

export function createFeaturedBooleanField(
  overrides?: Partial<SelectFilterField>
): SelectFilterField {
  return createBooleanSelectField("isFeatured", "Featured", overrides);
}

export function createRelationMultiselectField(
  id: string,
  label: string,
  options: FilterOption[],
  overrides?: Partial<MultiSelectFilterField>
): MultiSelectFilterField {
  return {
    id,
    label,
    type: "multiselect",
    options,
    disabledOperators: [...RELATION_DISABLED_OPERATORS],
    ...overrides
  };
}
