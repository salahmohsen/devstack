/**
 * Close/expand the dashboard details panel without coupling item stores to layout.
 * Close unmounts inspect content. Expand only clears the collapsed hide flag.
 */

const closeListeners = new Set<() => void>();
const expandListeners = new Set<() => void>();

export function subscribeSidePanelClose(listener: () => void): () => void {
  closeListeners.add(listener);
  return () => {
    closeListeners.delete(listener);
  };
}

export function subscribeSidePanelExpand(listener: () => void): () => void {
  expandListeners.add(listener);
  return () => {
    expandListeners.delete(listener);
  };
}

/** Unmount inspect/item hosts. Call on chevron close and route change. */
export function dismissDashboardSidePanel(): void {
  for (const listener of closeListeners) listener();
}

/** Show the slot again so the next item click can paint. */
export function expandDashboardSidePanel(): void {
  for (const listener of expandListeners) listener();
}
