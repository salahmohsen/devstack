/**
 * Close/expand the dashboard details panel without coupling item stores to layout.
 * Close unmounts inspect content. Expand only clears the collapsed hide flag.
 */

const closeListeners = new Set<() => void>();
const expandListeners = new Set<() => void>();
/** Return true to consume dismiss (skip close listeners). */
const dismissGuards = new Set<() => boolean>();

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

/** Register a dismiss interceptor (e.g. pop a side-panel stack frame first). */
export function registerSidePanelDismissGuard(guard: () => boolean): () => void {
  dismissGuards.add(guard);
  return () => {
    dismissGuards.delete(guard);
  };
}

/**
 * Unmount inspect/item hosts. Call on chevron close and route change.
 * @returns true when a dismiss guard consumed the event (e.g. dirty form).
 * Pass `{ force: true }` to skip dirty-form guards (e.g. hub `/new` session).
 */
export function dismissDashboardSidePanel(opts?: { force?: boolean }): boolean {
  if (!opts?.force) {
    for (const guard of dismissGuards) {
      if (guard()) return true;
    }
  }
  for (const listener of closeListeners) listener();
  return false;
}

/** Show the slot again so the next item click can paint. */
export function expandDashboardSidePanel(): void {
  for (const listener of expandListeners) listener();
}
