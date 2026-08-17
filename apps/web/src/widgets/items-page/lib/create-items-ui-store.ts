import { useMemo, useSyncExternalStore } from "react";

import { expandDashboardSidePanel, subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

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
 * const { activeTab, openedItem, openItem, closePanel } = useExperienceStore();
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
    openedItem: null,
    isItemOpen: null,
    selectedIds: null
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
    setState({ activeTab: tab, selectedIds: null });
  };

  const setFilter = (filter: Filter) => {
    setState({ filter, selectedIds: null });
  };

  const setOpenedItem = (item: T | null) => {
    setState({ openedItem: item });
  };

  const setIsItemOpen = (open: Record<string, boolean> | null) => {
    setState({ isItemOpen: open });
  };

  const openItem = (id: string, item: T) => {
    const wasOpen = state.isItemOpen?.[id] ?? false;
    if (wasOpen) {
      setState({
        isItemOpen: null,
        openedItem: null
      });
      return;
    }
    expandDashboardSidePanel();
    setState({
      isItemOpen: { [id]: true },
      openedItem: item
    });
  };

  const closePanel = () => {
    setState({ isItemOpen: null, openedItem: null });
  };

  subscribeSidePanelClose(closePanel);

  const toggleSelect = (id: string) => {
    const current = state.selectedIds ?? {};
    setState({ selectedIds: { ...current, [id]: !current[id] } });
  };

  const selectAll = (ids: string[]) => {
    setState({ selectedIds: Object.fromEntries(ids.map((id) => [id, true])) });
  };

  const clearSelection = () => {
    setState({ selectedIds: null });
  };

  const setTabAndFilter = (tab: Tab) => {
    if (config.isValidTab && !config.isValidTab(tab)) return;
    const filter = config.tabToFilter ? config.tabToFilter(tab) : state.filter;
    setState({ activeTab: tab, filter, selectedIds: null });
  };

  const useStore = (): ItemsUIState<T, Tab, Filter> & {
    setActiveTab: typeof setActiveTab;
    setFilter: typeof setFilter;
    setOpenedItem: typeof setOpenedItem;
    setIsItemOpen: typeof setIsItemOpen;
    openItem: typeof openItem;
    closePanel: typeof closePanel;
    setTabAndFilter: typeof setTabAndFilter;
    toggleSelect: typeof toggleSelect;
    selectAll: typeof selectAll;
    clearSelection: typeof clearSelection;
  } => {
    const snapshot = useSyncExternalStore(subscribe, getState, getState);
    return useMemo(() => {
      return {
        ...snapshot,
        setActiveTab,
        setFilter,
        setOpenedItem,
        setIsItemOpen,
        openItem,
        closePanel,
        setTabAndFilter,
        toggleSelect,
        selectAll,
        clearSelection
      };
    }, [snapshot]);
  };

  return useStore as ItemsUIStore<T, Tab, Filter>;
}
