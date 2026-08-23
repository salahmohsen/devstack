"use client";

import { ArrowUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { isCompleteFilterLeaf } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  FilterAddButton,
  FilterChips,
  FilterClearButton,
  FiltersBar,
  FiltersProvider,
  useFiltersActions,
  useFiltersState,
  type FilterField,
  type FilterValue,
  type FiltersLabels
} from "@tsu-stack/ui/components/filters";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@tsu-stack/ui/components/input-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

import { defaultSortDir, type ListSearchVariant } from "@/widgets/items-page/lib/list-search";

const SEARCH_DEBOUNCE_MS = 300;
const CATALOG_DEFAULT_SORT = "__default__";

export type ListSearchSortOption = {
  value: string;
  label: string;
};

export type ListSearchBarLabels = Partial<FiltersLabels> & {
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  sortAriaLabel?: string;
  defaultSort?: string;
};

type ListSearchBarSharedProps = {
  fields: FilterField[];
  value: FilterValue[];
  onValueChange: (value: FilterValue[]) => void;
  q?: string;
  onQChange: (q: string | undefined) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  sortOptions: readonly ListSearchSortOption[];
  onSortChange: (next: { sortBy?: string; sortDir?: "asc" | "desc" }) => void;
  /** Renders immediately before the sort control (e.g. board/list view toggle). */
  beforeSort?: ReactNode;
  /**
   * Secondary result meta (e.g. “21 jobs”) — trailing toolbar, muted, non-interactive
   * (better-layout: metadata trails; keep distinct from controls).
   */
  status?: ReactNode;
  labels?: ListSearchBarLabels;
  className?: string;
};

export type ListSearchBarProps =
  | (ListSearchBarSharedProps & { variant: "catalog" })
  | (ListSearchBarSharedProps & {
      variant: Exclude<ListSearchVariant, "catalog">;
      onJobsClear: () => void;
    });

function completeLeaves(values: FilterValue[]): FilterValue[] {
  return values.filter(isCompleteFilterLeaf);
}

function JobsClearButton({ hasQuery, onClear }: { hasQuery: boolean; onClear: () => void }) {
  const { filters } = useFiltersState();
  const { labels, size } = useFiltersActions();
  if (filters.length === 0 && !hasQuery) return null;
  return (
    <Button
      className="gap-1.5 text-muted-foreground"
      data-slot="filter-clear"
      onClick={onClear}
      size={size}
      type="button"
      variant="ghost"
    >
      <XIcon aria-hidden="true" />
      {labels.clear}
    </Button>
  );
}

export function ListSearchBar(props: ListSearchBarProps) {
  const {
    fields,
    value,
    onValueChange,
    q,
    onQChange,
    sortBy,
    sortOptions,
    onSortChange,
    beforeSort,
    status,
    variant,
    labels,
    className
  } = props;
  const onJobsClear = variant === "catalog" ? undefined : props.onJobsClear;

  const searchPlaceholder = labels?.searchPlaceholder ?? "Search";
  const searchAriaLabel = labels?.searchAriaLabel ?? "Search";
  const sortAriaLabel = labels?.sortAriaLabel ?? "Sort";
  const defaultSortLabel = labels?.defaultSort ?? "Default";

  const qProp = q ?? "";
  const [localQ, setLocalQ] = useState(qProp);
  const [prevQProp, setPrevQProp] = useState(qProp);
  if (qProp !== prevQProp) {
    setPrevQProp(qProp);
    if (qProp !== localQ && qProp !== localQ.trim()) {
      setLocalQ(qProp);
    }
  }
  const [debouncedQ, setDebouncedQ] = useDebouncedValue(localQ, SEARCH_DEBOUNCE_MS);

  const clearQ = () => {
    setLocalQ("");
    setDebouncedQ("");
    onQChange(undefined);
  };

  useEffect(() => {
    // Unsettled debounce still holds the pre-clear string; skip so Clear can drop `q`.
    if (localQ !== debouncedQ) return;
    const next = debouncedQ.trim();
    const committed = qProp.trim();
    if (next === committed) return;
    onQChange(next.length > 0 ? next : undefined);
  }, [debouncedQ, localQ, qProp, onQChange]);

  const [drafts, setDrafts] = useState<FilterValue[]>([]);
  const committedKey = value
    .map((item) => `${item.field}\0${item.operator}\0${JSON.stringify(item.value)}`)
    .join("\n");
  const [prevCommittedKey, setPrevCommittedKey] = useState(committedKey);
  if (committedKey !== prevCommittedKey) {
    setPrevCommittedKey(committedKey);
    const committedFields = new Set(value.map((item) => item.field));
    setDrafts(drafts.filter((draft) => !committedFields.has(draft.field)));
  }

  const cubbyValue = useMemo(() => {
    const draftFields = new Set(drafts.map((draft) => draft.field));
    const committed = value.filter((item) => !draftFields.has(item.field));
    return [...committed, ...drafts];
  }, [value, drafts]);

  const handleFiltersChange = (next: FilterValue[]) => {
    setDrafts(next.filter((item) => !isCompleteFilterLeaf(item)));
    onValueChange(completeLeaves(next));
  };

  const handleJobsClear = () => {
    setDrafts([]);
    clearQ();
    onJobsClear?.();
  };

  const catalogItems =
    variant === "catalog"
      ? [{ value: CATALOG_DEFAULT_SORT, label: defaultSortLabel }, ...sortOptions]
      : [...sortOptions];
  const jobsDefaultSort = variant === "catalog" ? undefined : sortOptions[0]?.value;
  const selectedSort =
    variant === "catalog" ? (sortBy ?? CATALOG_DEFAULT_SORT) : (sortBy ?? jobsDefaultSort ?? "");

  const handleSortValue = (next: string) => {
    if (variant === "catalog" && next === CATALOG_DEFAULT_SORT) {
      // `withListSearch` merges; `{}` would keep the previous sort. Undefined omits it.
      onSortChange({ sortBy: undefined, sortDir: undefined });
      return;
    }
    if (next === sortBy) return;
    onSortChange({ sortBy: next, sortDir: defaultSortDir(next) });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <InputGroup className="w-full max-w-70 min-w-40 sm:w-70">
        <InputGroupInput
          aria-label={searchAriaLabel}
          onChange={(event) => setLocalQ(event.target.value)}
          placeholder={searchPlaceholder}
          size="sm"
          type="search"
          value={localQ}
        />
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        {localQ ? (
          <InputGroupAddon align="inline-end">
            <Button
              aria-label="Clear search"
              onClick={clearQ}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <FiltersProvider
        allowDuplicateFields={false}
        fields={fields}
        labels={labels}
        onValueChange={handleFiltersChange}
        size="sm"
        value={cubbyValue}
      >
        <FiltersBar className="min-w-0 flex-1">
          <FilterChips />
          <FilterAddButton />
          {variant === "catalog" ? (
            <FilterClearButton />
          ) : (
            <JobsClearButton hasQuery={localQ.trim().length > 0} onClear={handleJobsClear} />
          )}
        </FiltersBar>
      </FiltersProvider>

      {status || beforeSort || catalogItems.length > 0 ? (
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {status ? (
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {status}
            </span>
          ) : null}
          {beforeSort}
          {catalogItems.length > 0 ? (
            <Select
              aria-label={sortAriaLabel}
              items={catalogItems}
              onValueChange={(next) => {
                if (typeof next !== "string" || next.length === 0) return;
                handleSortValue(next);
              }}
              value={selectedSort}
            >
              <SelectTrigger className="w-fit max-w-56" size="sm">
                <ArrowUpDownIcon aria-hidden="true" />
                <SelectValue placeholder={sortAriaLabel} />
              </SelectTrigger>
              <SelectPopup>
                {variant === "catalog" ? (
                  <>
                    <SelectItem value={CATALOG_DEFAULT_SORT}>{defaultSortLabel}</SelectItem>
                    {sortOptions.length > 0 ? <SelectSeparator /> : null}
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectPopup>
            </Select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
