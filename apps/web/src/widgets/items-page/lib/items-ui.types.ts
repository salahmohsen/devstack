export type ItemsUIConfig<_T extends { id: string }, Tab extends string, Filter extends string> = {
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
  openedItem: T | null;
  isItemOpen: Record<string, boolean> | null;
  selectedIds: Record<string, boolean> | null;
};

export type ItemsUIStore<
  T extends { id: string },
  Tab extends string,
  Filter extends string
> = () => ItemsUIState<T, Tab, Filter> & {
  setActiveTab: (tab: Tab) => void;
  setFilter: (filter: Filter) => void;
  setOpenedItem: (item: T | null) => void;
  setIsItemOpen: (open: Record<string, boolean> | null) => void;
  /**
   * Open an item for inspection: sets `openedItem` and marks `isItemOpen[id] = true`.
   * Toggling an already-open item closes the panel (sets both back to null).
   */
  openItem: (id: string, item: T) => void;
  closePanel: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  /**
   * Set the active tab and its derived filter in one call.
   * Falls back to the existing filter if `tabToFilter` is not configured.
   */
  setTabAndFilter: (tab: Tab) => void;
};
