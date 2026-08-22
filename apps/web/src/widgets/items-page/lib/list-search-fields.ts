import {
  type FilterField,
  type FilterOption,
  type MultiSelectFilterField,
  type NumberFilterField,
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

const EMPTYABLE_OPERATORS = [
  { id: "is_empty", label: "is empty", shape: "none" as const },
  { id: "is_not_empty", label: "is not empty", shape: "none" as const }
];

/** Presence-only chip (`tiedToJob`): `is empty` / `is not empty`, no value. */
export function createEmptyableField(
  id: string,
  label: string,
  overrides?: Partial<SelectFilterField>
): FilterField {
  return {
    id,
    label,
    type: "select",
    options: [],
    operators: EMPTYABLE_OPERATORS,
    ...overrides
  };
}

const OUTCOME_OPERATORS = [
  { id: "is_empty", label: "is empty", shape: "none" as const },
  { id: "is_not_empty", label: "is not empty", shape: "none" as const },
  { id: "is_any_of", label: "is any of", shape: "scalar" as const },
  { id: "is_not_any_of", label: "is not any of", shape: "scalar" as const }
];

/** Tracking chip: `is` only (inbox / dismissed). Page-scoped all is not a chip. */
export function createTrackingStatusField(
  options: FilterOption[],
  overrides?: Partial<SelectFilterField>
): SelectFilterField {
  return {
    id: "trackingStatus",
    label: "Tracking",
    type: "select",
    options,
    operators: [{ id: "is", label: "is", shape: "scalar" }],
    disabledOperators: ["is_not", "is_empty", "is_not_empty"],
    ...overrides
  };
}

/**
 * Tracked Open seed (`is empty`) plus closed outcomes.
 * Multiselect so `is any of` can pick several closed outcomes.
 */
export function createOutcomeField(
  options: FilterOption[],
  overrides?: Partial<MultiSelectFilterField>
): MultiSelectFilterField {
  return {
    id: "outcome",
    label: "Outcome",
    type: "multiselect",
    options,
    operators: OUTCOME_OPERATORS,
    disabledOperators: ["includes_all"],
    ...overrides
  };
}

export function createStageField(
  options: FilterOption[],
  overrides?: Partial<MultiSelectFilterField>
): MultiSelectFilterField {
  return createRelationMultiselectField("stage", "Stage", options, overrides);
}

export function createMatchScoreField(overrides?: Partial<NumberFilterField>): NumberFilterField {
  return {
    id: "matchScore",
    label: "Match score",
    type: "number",
    suffix: "%",
    ...overrides
  };
}
