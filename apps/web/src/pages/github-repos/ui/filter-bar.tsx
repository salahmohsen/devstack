import { memo, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PlusSignIcon,
  Remove01Icon,
  SearchIcon,
  SortIcon
} from "@tsu-stack/icons";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  type ActiveFilter,
  type FilterableItem,
  type FilterDefinition,
  type FilterOption,
  type ListFilterState,
  type SortOption
} from "./use-list-filters";

export const FilterBar = memo(function FilterBar<T extends FilterableItem>({
  state,
  searchPlaceholder = "Search by title, author, repo, or #..."
}: {
  state: ListFilterState<T>;
  searchPlaceholder?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchInput
          value={state.searchQuery}
          onChange={state.setSearchQuery}
          placeholder={searchPlaceholder}
        />
        <SortDropdown options={state.sortOptions} value={state.sortId} onChange={state.setSortId} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {state.activeFilters.map((filter) => {
          const def = state.filterDefs.find((candidate) => candidate.id === filter.fieldId);
          if (!def) return null;
          const options = state.availableOptions.get(filter.fieldId) ?? [];
          return (
            <FilterPill
              key={filter.fieldId}
              filter={filter}
              definition={def}
              options={options}
              onRemoveValue={state.removeFilterValue}
              onRemove={state.removeFilter}
              onAdd={state.addFilter}
            />
          );
        })}
        <AddFilterButton
          filterDefs={state.filterDefs}
          activeFilters={state.activeFilters}
          availableOptions={state.availableOptions}
          onAdd={state.addFilter}
          onRemoveValue={state.removeFilterValue}
        />
        {state.hasActiveFilters && (
          <button
            type="button"
            onClick={state.clearAllFilters}
            title="Clear all filters"
            aria-label="Clear all filters"
            className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Remove01Icon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}) as <T extends FilterableItem>(props: {
  state: ListFilterState<T>;
  searchPlaceholder?: string;
}) => ReactNode;

function SearchInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex w-70 items-center gap-2 rounded-lg border border-border/50 bg-surface-1 px-3 py-1.5 transition-colors focus-within:border-border">
      <SearchIcon size={14} className="shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <CloseIcon size={13} />
        </button>
      )}
    </div>
  );
}

function SortDropdown({
  options,
  value,
  onChange
}: {
  options: SortOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.id === value);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/50 bg-surface-1 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <SortIcon size={14} strokeWidth={1.9} />
        <span className="whitespace-nowrap">{current?.label ?? "Sort"}</span>
        <ChevronDownIcon size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <DropdownPanel onClose={() => setOpen(false)} anchorRef={ref}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
                option.id === value && "text-foreground",
                option.id !== value && "text-muted-foreground"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {option.id === value && <CheckIcon size={13} className="shrink-0" />}
            </button>
          ))}
        </DropdownPanel>
      )}
    </div>
  );
}

function FilterPill({
  filter,
  definition,
  options,
  onRemoveValue,
  onRemove,
  onAdd
}: {
  filter: ActiveFilter;
  definition: FilterDefinition;
  options: FilterOption[];
  onRemoveValue: (fieldId: string, value: string) => void;
  onRemove: (fieldId: string) => void;
  onAdd: (fieldId: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => filter.values.has(option.value));

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-l-md border border-border/60 bg-surface-1 px-2 py-1 text-xs transition-colors hover:bg-surface-2"
      >
        <definition.icon size={13} strokeWidth={2} />
        <span className="font-medium text-muted-foreground">{definition.label}</span>
        <span className="text-muted-foreground/60">is</span>
        {selectedOptions.length > 3 ? (
          <span className="flex items-center gap-1.5 font-medium">
            <span className="flex items-center -space-x-1.5">
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className="inline-flex shrink-0 rounded-full ring-1 ring-surface-1"
                >
                  {option.icon}
                </span>
              ))}
            </span>
            <span className="text-muted-foreground">{selectedOptions.length} selected</span>
          </span>
        ) : (
          <span className="flex max-w-62.5 items-center gap-1 truncate font-medium">
            {selectedOptions.map((option, index) => (
              <span key={option.value} className="flex items-center gap-1">
                {index > 0 && <span>,</span>}
                {option.icon && <span className="inline-flex shrink-0">{option.icon}</span>}
                <span>{option.label}</span>
              </span>
            ))}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onRemove(filter.fieldId)}
        className="flex items-center self-stretch rounded-r-md border border-l-0 border-border/60 bg-surface-1 px-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <CloseIcon size={12} />
      </button>
      {open && (
        <ValuePicker
          options={options}
          selectedValues={filter.values}
          onToggle={(value) => {
            if (filter.values.has(value)) {
              onRemoveValue(filter.fieldId, value);
            } else {
              onAdd(filter.fieldId, value);
            }
          }}
          onClose={() => setOpen(false)}
          anchorRef={ref}
        />
      )}
    </div>
  );
}

function AddFilterButton({
  filterDefs,
  activeFilters,
  availableOptions,
  onAdd,
  onRemoveValue
}: {
  filterDefs: FilterDefinition[];
  activeFilters: ActiveFilter[];
  availableOptions: Map<string, FilterOption[]>;
  onAdd: (fieldId: string, value: string) => void;
  onRemoveValue: (fieldId: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const directFilterDef = filterDefs.length === 1 ? filterDefs[0] : null;
  const close = () => {
    setOpen(false);
    setSelectedFieldId(null);
  };

  const activeFieldIds = new Set(activeFilters.map((filter) => filter.fieldId));
  const activeFieldId = directFilterDef?.id ?? selectedFieldId;
  const selectedOptions = activeFieldId ? (availableOptions.get(activeFieldId) ?? []) : [];
  const selectedValues =
    activeFilters.find((filter) => filter.fieldId === activeFieldId)?.values ?? new Set<string>();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSelectedFieldId(null);
        }}
        className="flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <PlusSignIcon size={13} />
        <span>Filter</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute top-full left-0 z-50 mt-1.5 flex gap-1">
            {directFilterDef ? (
              <ValuePickerInline
                options={selectedOptions}
                selectedValues={selectedValues}
                onToggle={(value) => {
                  if (selectedValues.has(value)) {
                    onRemoveValue(directFilterDef.id, value);
                  } else {
                    onAdd(directFilterDef.id, value);
                  }
                }}
              />
            ) : (
              <FieldPickerInline
                filterDefs={filterDefs}
                activeFieldIds={activeFieldIds}
                selectedFieldId={selectedFieldId}
                onSelect={setSelectedFieldId}
              />
            )}
            {!directFilterDef && selectedFieldId && (
              <ValuePickerInline
                key={selectedFieldId}
                options={selectedOptions}
                selectedValues={selectedValues}
                onToggle={(value) => {
                  if (selectedValues.has(value)) {
                    onRemoveValue(selectedFieldId, value);
                  } else {
                    onAdd(selectedFieldId, value);
                  }
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FieldPickerInline({
  filterDefs,
  activeFieldIds,
  selectedFieldId,
  onSelect
}: {
  filterDefs: FilterDefinition[];
  activeFieldIds: Set<string>;
  selectedFieldId: string | null;
  onSelect: (fieldId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const filtered = filterDefs.filter((def) =>
    def.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-w-45 rounded-lg border border-border/60 bg-popover p-2 shadow-lg">
      <div className="-mx-2 flex items-center gap-2 border-b border-border/40 px-2 pb-2">
        <SearchIcon size={13} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex flex-col gap-0.5 pt-1">
        {filtered.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => onSelect(def.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
              def.id === selectedFieldId && "bg-surface-2",
              activeFieldIds.has(def.id) && "text-muted-foreground"
            )}
          >
            <def.icon size={14} strokeWidth={1.9} />
            <span>{def.label}</span>
            {activeFieldIds.has(def.id) && (
              <CheckIcon size={13} className="ml-auto shrink-0 text-muted-foreground" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
            No matching filters
          </p>
        )}
      </div>
    </div>
  );
}

function ValuePickerInline({
  options,
  selectedValues,
  onToggle
}: {
  options: FilterOption[];
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-w-50 rounded-lg border border-border/60 bg-popover p-2 shadow-lg">
      <div className="-mx-2 flex items-center gap-2 border-b border-border/40 px-2 pb-2">
        <SearchIcon size={13} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto pt-1">
        {filtered.map((option) => {
          const isSelected = selectedValues.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60"
                )}
              >
                {isSelected && <CheckIcon size={11} />}
              </span>
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
            No matching options
          </p>
        )}
      </div>
    </div>
  );
}

function ValuePicker({
  options,
  selectedValues,
  onToggle,
  onClose,
  anchorRef
}: {
  options: FilterOption[];
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
  onClose: () => void;
  anchorRef: RefObject<HTMLDivElement | null>;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DropdownPanel onClose={onClose} anchorRef={anchorRef}>
      <div className="-mx-2 flex items-center gap-2 border-b border-border/40 px-2 pb-2">
        <SearchIcon size={13} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto pt-1">
        {filtered.map((option) => {
          const isSelected = selectedValues.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60"
                )}
              >
                {isSelected && <CheckIcon size={11} />}
              </span>
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
            No matching options
          </p>
        )}
      </div>
    </DropdownPanel>
  );
}

function DropdownPanel({
  children,
  onClose,
  anchorRef: _anchorRef
}: {
  children: ReactNode;
  onClose: () => void;
  anchorRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 z-50 mt-1.5 min-w-50 rounded-lg border border-border/60 bg-popover p-2 shadow-lg">
        {children}
      </div>
    </>
  );
}
