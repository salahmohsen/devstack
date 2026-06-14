import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode
} from "react";

import { type SerializedFilterStore } from "./filter-cookie";
import { readFilterCookieClient, writeFilterCookie } from "./filter-cookie";

export type FilterDefinition = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  extractOptions: (items: FilterableItem[]) => FilterOption[];
  match: (item: FilterableItem, values: Set<string>) => boolean;
};

export type FilterOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export type ActiveFilter = {
  fieldId: string;
  values: Set<string>;
};

export type SortOption = {
  id: string;
  label: string;
  compare: (a: FilterableItem, b: FilterableItem) => number;
};

export type FilterableItem = {
  id: number;
  title: string;
  updatedAt: string;
  createdAt: string;
  comments: number;
  author: { login: string; avatarUrl: string } | null;
  repository: { fullName: string };
  state: string;
  [key: string]: unknown;
};

function readPageState(
  store: SerializedFilterStore,
  pageId: string,
  defaultSortId: string
): { searchQuery: string; activeFilters: ActiveFilter[]; sortId: string } {
  const page = store[pageId];
  if (!page || typeof page !== "object") {
    return { searchQuery: "", activeFilters: [], sortId: defaultSortId };
  }

  const searchQuery = typeof page.searchQuery === "string" ? page.searchQuery : "";
  const sortId = typeof page.sortId === "string" ? page.sortId : defaultSortId;

  let activeFilters: ActiveFilter[] = [];
  if (Array.isArray(page.activeFilters)) {
    activeFilters = page.activeFilters
      .filter(
        (filter): filter is { fieldId: string; values: string[] } =>
          typeof filter === "object" &&
          filter !== null &&
          typeof filter.fieldId === "string" &&
          Array.isArray(filter.values) &&
          filter.values.every((value: unknown) => typeof value === "string")
      )
      .map((filter) => {
        return { fieldId: filter.fieldId, values: new Set(filter.values) };
      });
  }

  return { searchQuery, activeFilters, sortId };
}

function writePageState(
  pageId: string,
  state: { searchQuery: string; activeFilters: ActiveFilter[]; sortId: string }
) {
  const store = readFilterCookieClient();
  store[pageId] = {
    searchQuery: state.searchQuery,
    activeFilters: state.activeFilters.map((filter) => {
      return {
        fieldId: filter.fieldId,
        values: [...filter.values]
      };
    }),
    sortId: state.sortId
  };
  writeFilterCookie(store);
}

export function useListFilters<T extends FilterableItem>({
  pageId,
  items,
  filterDefs,
  sortOptions,
  defaultSortId,
  initialStore
}: {
  pageId: string;
  items: T[];
  filterDefs: FilterDefinition[];
  sortOptions: SortOption[];
  defaultSortId: string;
  initialStore?: SerializedFilterStore;
}) {
  const [state, setState] = useState(() =>
    readPageState(initialStore ?? {}, pageId, defaultSortId)
  );

  const sortId = sortOptions.some((option) => option.id === state.sortId)
    ? state.sortId
    : defaultSortId;

  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    writePageState(pageId, state);
  }, [pageId, state]);

  const availableOptions = useMemo(() => {
    const map = new Map<string, FilterOption[]>();
    for (const def of filterDefs) {
      map.set(def.id, def.extractOptions(items));
    }
    return map;
  }, [items, filterDefs]);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState((prev) => {
      return { ...prev, searchQuery };
    });
  }, []);

  const setSortId = useCallback((nextSortId: string) => {
    setState((prev) => {
      return { ...prev, sortId: nextSortId };
    });
  }, []);

  const addFilter = useCallback((fieldId: string, value: string) => {
    setState((prev) => {
      const existing = prev.activeFilters.find((filter) => filter.fieldId === fieldId);
      if (existing) {
        return {
          ...prev,
          activeFilters: prev.activeFilters.map((filter) =>
            filter.fieldId === fieldId
              ? { ...filter, values: new Set([...filter.values, value]) }
              : filter
          )
        };
      }
      return {
        ...prev,
        activeFilters: [...prev.activeFilters, { fieldId, values: new Set([value]) }]
      };
    });
  }, []);

  const removeFilterValue = useCallback((fieldId: string, value: string) => {
    setState((prev) => {
      return {
        ...prev,
        activeFilters: prev.activeFilters
          .map((filter) => {
            if (filter.fieldId !== fieldId) return filter;
            const next = new Set(filter.values);
            next.delete(value);
            return { ...filter, values: next };
          })
          .filter((filter) => filter.values.size > 0)
      };
    });
  }, []);

  const removeFilter = useCallback((fieldId: string) => {
    setState((prev) => {
      return {
        ...prev,
        activeFilters: prev.activeFilters.filter((filter) => filter.fieldId !== fieldId)
      };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setState((prev) => {
      return {
        ...prev,
        searchQuery: "",
        activeFilters: []
      };
    });
  }, []);

  const hasActiveFilters = state.activeFilters.length > 0 || state.searchQuery.length > 0;

  return {
    searchQuery: state.searchQuery,
    setSearchQuery,
    activeFilters: state.activeFilters,
    sortId,
    setSortId,
    availableOptions,
    addFilter,
    removeFilterValue,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
    sortOptions,
    filterDefs
  };
}

export type ListFilterState<T extends FilterableItem> = ReturnType<typeof useListFilters<T>>;

export function applyFilters<T extends FilterableItem>(items: T[], state: ListFilterState<T>): T[] {
  const query = state.searchQuery.toLowerCase().trim();
  const sortFn =
    state.sortOptions.find((sort) => sort.id === state.sortId)?.compare ??
    state.sortOptions[0].compare;

  let result: T[] = items;

  if (query) {
    result = result.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.repository.fullName.toLowerCase().includes(query) ||
        (item.author?.login.toLowerCase().includes(query) ?? false)
    );
  }

  for (const filter of state.activeFilters) {
    if (filter.values.size === 0) continue;
    const def = state.filterDefs.find((candidate) => candidate.id === filter.fieldId);
    if (!def) continue;
    result = result.filter((item) => def.match(item, filter.values));
  }

  return [...result].toSorted(sortFn);
}
