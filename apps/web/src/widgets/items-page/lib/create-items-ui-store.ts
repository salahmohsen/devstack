import { useMemo, useSyncExternalStore } from "react";

import {
  type ItemsUIConfig,
  type ItemsUIState,
  type ItemsUIStore
} from "@/widgets/items-page/lib/items-ui.types";

/**
 * Create a per-feature UI store hook for the items-page widget.
 *
 * Holds tab, filter, and selection state. Server data (the list of items)
 * is owned by the page's query — this store only owns UI state.
 *
 * The returned hook returns the current state plus stable action methods.
 * The actions are module-level (so they're referentially stable across
 * renders) and the wrapper object is memoised to a new reference only
 * when the underlying state changes.
 *
 * Usage:
 * ```ts
 * // experience.slice.ts
 * export const useExperienceStore = createItemsUIStore<
 *   Experience,
 *   ExperienceTabs,
 *   ExperienceFilters
 * >({
 *   initialTab: ExperienceTabs.Published,
 *   initialFilter: ExperienceFilters.All,
 *   tabToFilter: (tab) =>
 *     tab === ExperienceTabs.Draft ? ExperienceFilters.Draft : ExperienceFilters.All
 * });
 *
 * // experiences-page.tsx
 * const { activeTab, itemInfo, selectItem, clearSelection } = useExperienceStore();
 * ```
 */
export function createItemsUIStore<
  T extends { id: string },
  Tab extends string,
  Filter extends string
>(config: ItemsUIConfig<T, Tab, Filter>): ItemsUIStore<T, Tab, Filter> {
  let state: ItemsUIState<T, Tab, Filter> = {
    activeTab: config.initialTab,
    filter: config.initialFilter,
    itemInfo: null,
    isItemSelected: null
  };

  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (partial: Partial<ItemsUIState<T, Tab, Filter>>) => {
    state = { ...state, ...partial };
    for (const listener of listeners) {
      listener();
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const setActiveTab = (tab: Tab) => {
    if (config.isValidTab && !config.isValidTab(tab)) return;
    setState({ activeTab: tab });
  };

  const setFilter = (filter: Filter) => {
    setState({ filter });
  };

  const setItemInfo = (item: T | null) => {
    setState({ itemInfo: item });
  };

  const setItemSelected = (selected: Record<string, boolean> | null) => {
    setState({ isItemSelected: selected });
  };

  const selectItem = (id: string, item: T) => {
    const wasSelected = state.isItemSelected?.[id] ?? false;
    setState({
      isItemSelected: { [id]: !wasSelected },
      itemInfo: wasSelected ? null : item
    });
  };

  const clearSelection = () => {
    setState({ isItemSelected: null, itemInfo: null });
  };

  const setTabAndFilter = (tab: Tab) => {
    if (config.isValidTab && !config.isValidTab(tab)) return;
    const filter = config.tabToFilter ? config.tabToFilter(tab) : state.filter;
    setState({ activeTab: tab, filter });
  };

  const useStore = (): ItemsUIState<T, Tab, Filter> & {
    setActiveTab: typeof setActiveTab;
    setFilter: typeof setFilter;
    setItemInfo: typeof setItemInfo;
    setItemSelected: typeof setItemSelected;
    selectItem: typeof selectItem;
    clearSelection: typeof clearSelection;
    setTabAndFilter: typeof setTabAndFilter;
  } => {
    const snapshot = useSyncExternalStore(subscribe, getState, getState);
    return useMemo(() => {
      return {
        ...snapshot,
        setActiveTab,
        setFilter,
        setItemInfo,
        setItemSelected,
        selectItem,
        clearSelection,
        setTabAndFilter
      };
    }, [snapshot]);
  };

  return useStore as ItemsUIStore<T, Tab, Filter>;
}
