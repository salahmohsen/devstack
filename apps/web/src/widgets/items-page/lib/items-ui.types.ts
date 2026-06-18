export type ItemsUIConfig<T extends { id: string }, Tab extends string, Filter extends string> = {
  initialTab: Tab;
  initialFilter: Filter;
  /**
   * Map a tab change to its default filter.
   * Used by `setTabAndFilter` to keep tab and filter in sync.
   */
  tabToFilter?: (tab: Tab) => Filter;
  /**
   * Optional hook called after a tab change to validate the new tab.
   * Return false to reject the change.
   */
  isValidTab?: (tab: Tab) => boolean;
};

export type ItemsUIState<T extends { id: string }, Tab extends string, Filter extends string> = {
  activeTab: Tab;
  filter: Filter;
  itemInfo: T | null;
  isItemSelected: Record<string, boolean> | null;
};

export type ItemsUIStore<
  T extends { id: string },
  Tab extends string,
  Filter extends string
> = () => ItemsUIState<T, Tab, Filter> & {
  setActiveTab: (tab: Tab) => void;
  setFilter: (filter: Filter) => void;
  setItemInfo: (item: T | null) => void;
  setItemSelected: (selected: Record<string, boolean> | null) => void;
  /**
   * Single-select helper: toggles the given id and updates `itemInfo`.
   * When the item becomes selected, sets `itemInfo` to `item`.
   * When the item becomes unselected, clears `itemInfo`.
   */
  selectItem: (id: string, item: T) => void;
  clearSelection: () => void;
  /**
   * Set the active tab and its derived filter in one call.
   * Falls back to the existing filter if `tabToFilter` is not configured.
   */
  setTabAndFilter: (tab: Tab) => void;
};
