"use client";

import { PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Combobox, ComboboxItem, ComboboxTrigger } from "@tsu-stack/ui/components/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import { Group, GroupText } from "@tsu-stack/ui/components/group";
import { Kbd } from "@tsu-stack/ui/components/kbd";
import { useControllableState } from "@tsu-stack/ui/hooks/use-controllable-state";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  FilterChipContext,
  FiltersActionsContext,
  FiltersAutoOpenContext,
  FiltersStateContext,
  useFilterChip,
  useFiltersActions,
  useFiltersAutoOpen,
  useFiltersState
} from "./filters-context";
import { FilterChipValue, FilterSearchPopup } from "./filters-value-controls";
import {
  type FilterChipProps,
  type FilterField,
  type FiltersBarProps,
  type FiltersLabels,
  type FiltersProps,
  type FiltersProviderProps,
  type FilterValue
} from "./lib/filters-types";
import {
  createFilter,
  describeFilter,
  FILTER_SIZES,
  patchFilter,
  resolveOperators
} from "./lib/filters-utils";

const DEFAULT_LABELS: FiltersLabels = {
  add: "Add filter",
  clear: "Clear",
  searchFields: "Filter...",
  searchValues: "Search...",
  noFields: "No filters found.",
  noResults: "No results found.",
  selectValue: "Select...",
  enterValue: "Enter value",
  value: "Value",
  min: "Min",
  max: "Max",
  operator: "operator",
  removeFilter: (fieldLabel) => `Remove ${fieldLabel} filter`
};

/** Small muted wrapper that normalizes field icons to 14px. */
function FieldIcon({ children }: { children?: React.ReactNode }): React.ReactElement | null {
  if (!children) return null;
  return (
    <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-3.5!">
      {children}
    </span>
  );
}

/**
 * Moves focus to the adjacent chip's remove button (or the add-filter trigger)
 * before a chip is removed, so focus never falls to `<body>`.
 */
function focusAdjacentChip(chip: HTMLElement | null): void {
  const bar = chip?.closest<HTMLElement>('[data-slot="filters"]');
  if (!chip || !bar) return;
  const chips = Array.from(bar.querySelectorAll<HTMLElement>('[data-slot="filter-chip"]'));
  const index = chips.indexOf(chip);
  const neighbor = chips[index + 1] ?? chips[index - 1];
  const target =
    neighbor?.querySelector<HTMLElement>('[data-slot="filter-chip-remove"]') ??
    bar.querySelector<HTMLElement>('[data-slot="filter-add"]');
  target?.focus();
}

/**
 * Owns filter state and provides it via context, without rendering any layout.
 * Wrap it around a `FiltersBar` plus any external UI (a results count, saved
 * views, an apply button) that should share the state through `useFilters`.
 */
function FiltersProvider({
  fields,
  value,
  defaultValue = [],
  onValueChange,
  size = "default",
  allowDuplicateFields = false,
  labels: labelsProp,
  children
}: FiltersProviderProps): React.ReactElement {
  const [filters, setFilters] = useControllableState<FilterValue[]>({
    value,
    defaultValue,
    onValueChange
  });

  // Tracks the freshly added filter so its value control opens on mount. The
  // chip consumes (clears) the flag once mounted, so later remounts of the
  // value control don't spuriously re-open it.
  const [lastAddedId, setLastAddedId] = React.useState<string | null>(null);
  const clearAutoOpen = React.useCallback(() => setLastAddedId(null), []);

  const labels = React.useMemo(() => {
    return { ...DEFAULT_LABELS, ...labelsProp };
  }, [labelsProp]);
  const fieldsById = React.useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [fields]
  );
  // Keyed by content (not the filters array identity) so the Set stays
  // referentially stable while a filter's value is being typed.
  const usedFieldsKey = filters
    .map((filter) => filter.field)
    .toSorted()
    .join("\u0000");
  const usedFieldIds = React.useMemo(
    () => new Set(usedFieldsKey ? usedFieldsKey.split("\u0000") : []),
    [usedFieldsKey]
  );

  const addFilter = React.useCallback(
    (filter: FilterValue) => {
      setFilters((prev) => [...prev, filter]);
      setLastAddedId(filter.id);
    },
    [setFilters]
  );
  const removeFilter = React.useCallback(
    (id: string) => setFilters((prev) => prev.filter((f) => f.id !== id)),
    [setFilters]
  );
  const clearAll = React.useCallback(() => setFilters([]), [setFilters]);
  const updateFilter = React.useCallback(
    (id: string, patch: Partial<Omit<FilterValue, "id">>) => {
      setFilters((prev) =>
        prev.map((filter) =>
          filter.id === id ? patchFilter(fieldsById.get(filter.field), filter, patch) : filter
        )
      );
    },
    [setFilters, fieldsById]
  );

  // Split contexts: `state` changes per keystroke, `actions` stays stable
  // (so leaves subscribed via useFiltersActions don't re-render while
  // typing), and the transient auto-open signal is isolated so its set/consume
  // cycle per add doesn't churn the actions context either.
  const stateContext = React.useMemo(() => {
    return { filters };
  }, [filters]);
  const autoOpenContext = React.useMemo(() => {
    return { lastAddedId, clearAutoOpen };
  }, [lastAddedId, clearAutoOpen]);
  const actionsContext = React.useMemo(() => {
    return {
      fields,
      size,
      labels,
      fieldsById,
      usedFieldIds,
      allowDuplicateFields,
      addFilter,
      updateFilter,
      removeFilter,
      clearAll
    };
  }, [
    fields,
    size,
    labels,
    fieldsById,
    usedFieldIds,
    allowDuplicateFields,
    addFilter,
    updateFilter,
    removeFilter,
    clearAll
  ]);

  return (
    <FiltersStateContext.Provider value={stateContext}>
      <FiltersActionsContext.Provider value={actionsContext}>
        <FiltersAutoOpenContext.Provider value={autoOpenContext}>
          {children}
        </FiltersAutoOpenContext.Provider>
      </FiltersActionsContext.Provider>
    </FiltersStateContext.Provider>
  );
}

/**
 * The flex row. Renders the default layout unless `children` is passed. Only
 * the default leaves subscribe to filter state, so a bar with custom children
 * doesn't re-render while a value is being typed.
 */
function FiltersBar({
  shortcut,
  className,
  children,
  ...props
}: FiltersBarProps): React.ReactElement {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="filters"
      {...props}
    >
      {children ?? (
        <>
          <FilterChips />
          <FilterAddButton shortcut={shortcut} />
          <FilterClearButton />
        </>
      )}
    </div>
  );
}

/** `FiltersProvider` + `FiltersBar` in one component, for the common case. */
function Filters({
  fields,
  value,
  defaultValue,
  onValueChange,
  size,
  allowDuplicateFields,
  labels,
  ...barProps
}: FiltersProps): React.ReactElement {
  return (
    <FiltersProvider
      allowDuplicateFields={allowDuplicateFields}
      defaultValue={defaultValue}
      fields={fields}
      labels={labels}
      onValueChange={onValueChange}
      size={size}
      value={value}
    >
      <FiltersBar {...barProps} />
    </FiltersProvider>
  );
}

/** Renders a `FilterChip` for every active filter. */
function FilterChips(): React.ReactElement {
  const { filters } = useFiltersState();
  const { fieldsById } = useFiltersActions();
  return (
    <>
      {filters.map((filter) => {
        const field = fieldsById.get(filter.field);
        if (!field) return null;
        return <FilterChip field={field} filter={filter} key={filter.id} />;
      })}
    </>
  );
}

// Memoized: chips subscribe only to the stable actions context and untouched
// `filter` objects keep their identity across edits, so typing in one chip's
// value doesn't re-render the others.
const FilterChip = React.memo(function FilterChip({
  filter,
  field: fieldProp,
  className,
  children,
  ...props
}: FilterChipProps): React.ReactElement | null {
  const { size, removeFilter, fieldsById } = useFiltersActions();
  const { lastAddedId, clearAutoOpen } = useFiltersAutoOpen();
  const field = fieldProp ?? fieldsById.get(filter.field);
  const autoOpen = filter.id === lastAddedId;

  // Consume the auto-open flag once this chip has mounted, so later remounts
  // of the value control (e.g. an operator shape change) don't re-open it.
  React.useEffect(() => {
    if (autoOpen) clearAutoOpen();
  }, [autoOpen, clearAutoOpen]);

  const chipContext = React.useMemo(
    () => (field ? { filter, field, size, autoOpen } : null),
    [filter, field, size, autoOpen]
  );

  if (!field || !chipContext) return null;

  return (
    <FilterChipContext.Provider value={chipContext}>
      <Group
        aria-label={describeFilter(field, filter)}
        className={cn("overflow-hidden rounded-lg border bg-card bg-clip-padding", className)}
        data-slot="filter-chip"
        onKeyDown={(event) => {
          if (event.key !== "Backspace" && event.key !== "Delete") return;
          // Only remove when focus is on one of the chip's own button
          // segments; inputs and custom controls keep their editing keys.
          const target = event.target;
          const isChipButton =
            target instanceof HTMLElement &&
            target.tagName === "BUTTON" &&
            (target.dataset.slot === "filter-chip-value" ||
              target.closest(
                '[data-slot="filter-chip-remove"], [data-slot="filter-chip-operator"]'
              ) !== null);
          if (!isChipButton) return;
          event.preventDefault();
          focusAdjacentChip(event.currentTarget);
          removeFilter(filter.id);
        }}
        {...props}
      >
        {children ?? (
          <>
            <FilterChipField />
            <FilterChipOperator />
            <FilterChipValue />
            <FilterChipRemove />
          </>
        )}
      </Group>
    </FilterChipContext.Provider>
  );
});

function FilterChipField({
  className,
  children,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  const { field, size } = useFilterChip();
  return (
    <GroupText
      className={cn(
        "gap-1.5 rounded-none border-0 border-r bg-transparent font-medium text-foreground shadow-none before:hidden",
        FILTER_SIZES[size].fieldLabel,
        className
      )}
      data-slot="filter-chip-field"
      {...props}
    >
      {children ?? (
        <>
          <FieldIcon>{field.icon}</FieldIcon>
          {field.label}
        </>
      )}
    </GroupText>
  );
}

function FilterChipOperator({
  className,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
  const { filter, field, size } = useFilterChip();
  const { updateFilter, labels } = useFiltersActions();
  const operators = resolveOperators(field);
  const current = operators.find((operator) => operator.id === filter.operator);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="filter-chip-operator"
        render={
          <Button
            aria-label={`${field.label} ${labels.operator}: ${current?.label ?? filter.operator}`}
            className={cn("rounded-none font-normal", className)}
            data-slot="filter-chip-operator"
            size={size}
            variant="ghost"
            {...props}
          />
        }
      >
        {current?.label ?? filter.operator}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup
          onValueChange={(next) => updateFilter(filter.id, { operator: next })}
          value={filter.operator}
        >
          {operators.map((operator) => (
            <DropdownMenuRadioItem key={operator.id} value={operator.id}>
              {operator.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterChipRemove({
  className,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
  const { filter, field } = useFilterChip();
  const { removeFilter, size, labels } = useFiltersActions();
  return (
    <Button
      aria-label={labels.removeFilter(field.label)}
      className={cn("rounded-none text-muted-foreground hover:text-foreground", className)}
      data-slot="filter-chip-remove"
      onClick={(event) => {
        focusAdjacentChip(event.currentTarget.closest<HTMLElement>('[data-slot="filter-chip"]'));
        removeFilter(filter.id);
      }}
      size={FILTER_SIZES[size].iconButton}
      variant="ghost"
      {...props}
    >
      <XIcon aria-hidden="true" />
    </Button>
  );
}

function FilterAddButton({
  children,
  shortcut,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  /** Key that opens this menu from the keyboard (e.g. `"f"`). */
  shortcut?: string;
}): React.ReactElement {
  const { fields, usedFieldIds, allowDuplicateFields, addFilter, labels, size } =
    useFiltersActions();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!shortcut) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // `defaultPrevented` also dedupes multiple Filters instances: the first
      // listener to accept the key prevents it for the rest.
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable
        ) {
          return;
        }
        // Don't steal the key from open popups (menu typeahead, dialogs).
        if (
          target.closest('[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]')
        ) {
          return;
        }
      }
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcut]);

  return (
    <Combobox<FilterField, false>
      itemToStringLabel={(field) => field.label}
      items={fields}
      onOpenChange={setOpen}
      onValueChange={(field) => {
        if (field) addFilter(createFilter(field));
      }}
      open={open}
      value={null}
    >
      <ComboboxTrigger
        data-slot="filter-add"
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            className={cn("gap-1.5 border-dashed text-muted-foreground", className)}
            data-slot="filter-add"
            size={size}
            variant="outline"
            {...props}
          />
        )}
      >
        <PlusIcon aria-hidden="true" />
        {children ?? labels.add}
        {shortcut ? <Kbd className="ms-1">{shortcut.toUpperCase()}</Kbd> : null}
      </ComboboxTrigger>
      <FilterSearchPopup
        className="min-w-56"
        empty={labels.noFields}
        placeholder={labels.searchFields}
      >
        {(field: FilterField) => (
          <ComboboxItem
            disabled={!allowDuplicateFields && usedFieldIds.has(field.id)}
            key={field.id}
            value={field}
          >
            <span className="flex items-center gap-2">
              <FieldIcon>{field.icon}</FieldIcon>
              <span className="truncate">{field.label}</span>
            </span>
          </ComboboxItem>
        )}
      </FilterSearchPopup>
    </Combobox>
  );
}

/** Clears every filter. Renders nothing while no filters are active. */
function FilterClearButton({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { clearAll, labels, size } = useFiltersActions();
  const { filters } = useFiltersState();
  if (filters.length === 0) return null;
  return (
    <Button
      className={cn("gap-1.5 text-muted-foreground", className)}
      data-slot="filter-clear"
      onClick={clearAll}
      size={size}
      variant="ghost"
      {...props}
    >
      <XIcon aria-hidden="true" />
      {children ?? labels.clear}
    </Button>
  );
}

function FilterActiveCount({
  className,
  ...props
}: React.ComponentProps<typeof Badge>): React.ReactElement {
  const { filters } = useFiltersState();
  return (
    <Badge className={className} data-slot="filter-active-count" variant="secondary" {...props}>
      {filters.length}
    </Badge>
  );
}

export {
  FilterActiveCount,
  FilterAddButton,
  FilterChip,
  FilterChipField,
  FilterChipOperator,
  FilterChipRemove,
  FilterChips,
  FilterChipValue,
  FilterClearButton,
  Filters,
  FiltersBar,
  FiltersProvider
};
export { useFilterChip, useFilters, useFiltersActions, useFiltersState } from "./filters-context";
export {
  asFilterValues,
  createFilter,
  defaultOperatorsFor,
  describeFilter,
  emptyValueFor,
  formatFilterValue,
  isValuelessOperator,
  operatorShape,
  operatorShapeFor,
  patchFilter,
  resolveOperators
} from "./lib/filters-utils";
export type {
  CustomFilterField,
  FilterChipProps,
  FilterField,
  FilterFieldType,
  FilterOperator,
  FilterOperatorShape,
  FilterOption,
  FilterSize,
  FiltersBarProps,
  FiltersLabels,
  FiltersProps,
  FiltersProviderProps,
  FilterValue,
  FilterValueControlProps,
  MultiSelectFilterField,
  NumberFilterField,
  NumberRange,
  SelectFilterField,
  TextFilterField
} from "./lib/filters-types";
